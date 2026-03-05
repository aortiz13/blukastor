import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

async function resolveCompanyId(supabase: any, companyId?: string, domain?: string): Promise<string | null> {
    if (companyId) return companyId
    if (!domain) return null

    const { data: byDomain } = await supabase
        .from('client_companies').select('id').eq('custom_domain', domain).limit(1).single()
    if (byDomain) return byDomain.id

    const { data: byConfig } = await supabase
        .from('client_companies').select('id').eq('frontend_config->>domain', domain).limit(1).single()
    if (byConfig) return byConfig.id

    const subdomain = domain.split('.')[0]
    if (subdomain) {
        const { data: byName } = await supabase
            .from('client_companies').select('id, name').ilike('name', `%${subdomain}%`).limit(1).single()
        if (byName) return byName.id
    }
    return null
}

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient()
        const { phone, otp, companyId: rawCompanyId, domain } = await request.json()

        if (!phone || !otp) {
            return NextResponse.json(
                { error: 'Teléfono y código son requeridos' },
                { status: 400 }
            )
        }

        const companyId = await resolveCompanyId(supabase, rawCompanyId, domain)
        if (!companyId) {
            return NextResponse.json(
                { error: 'No se pudo identificar la empresa' },
                { status: 400 }
            )
        }

        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

        // 1. Verify OTP
        const { data: otpRecord, error: otpError } = await supabase
            .from('phone_otps')
            .select('id, expires_at')
            .eq('phone', normalizedPhone)
            .eq('company_id', companyId)
            .eq('otp_code', otp)
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (otpError || !otpRecord) {
            return NextResponse.json(
                { error: 'Código de verificación inválido' },
                { status: 400 }
            )
        }

        // Check expiration
        if (new Date(otpRecord.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'El código de verificación ha expirado' },
                { status: 400 }
            )
        }

        // 2. Mark OTP as used
        await supabase
            .from('phone_otps')
            .update({ used: true })
            .eq('id', otpRecord.id)

        // 3. Find the contact and their auth user
        const { data: contact } = await supabase
            .from('contacts')
            .select('id, user_id, phone')
            .eq('phone', normalizedPhone)
            .eq('client_company_id', companyId)
            .limit(1)
            .single()

        if (!contact) {
            return NextResponse.json(
                { error: 'Contacto no encontrado' },
                { status: 404 }
            )
        }

        // 4. If the contact has a user_id, generate a magic link for that user
        if (contact.user_id) {
            // Get user email from auth
            const { data: { user } } = await supabase.auth.admin.getUserById(contact.user_id)

            if (user?.email) {
                // Generate a magic link
                const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: user.email,
                })

                if (linkError) {
                    console.error('Error generating magic link:', linkError)
                    return NextResponse.json(
                        { error: 'Error al generar enlace de sesión' },
                        { status: 500 }
                    )
                }

                return NextResponse.json({
                    success: true,
                    redirectUrl: linkData.properties?.action_link || null,
                    hasUser: true,
                })
            }
        }

        // 5. Contact exists but has no auth user — return success with contact info
        // The frontend can redirect to a simplified signup or directly log them in
        return NextResponse.json({
            success: true,
            hasUser: false,
            contactId: contact.id,
            message: 'Verificación exitosa. Tu número no tiene una cuenta asociada aún.',
        })

    } catch (error: any) {
        console.error('Error in phone-otp/verify:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno' },
            { status: 500 }
        )
    }
}
