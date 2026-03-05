import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: Request) {
    try {
        const supabase = await createServiceClient()
        const { phone, otp, companyId } = await request.json()

        if (!phone || !otp || !companyId) {
            return NextResponse.json(
                { error: 'Teléfono, código y empresa son requeridos' },
                { status: 400 }
            )
        }

        const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

        // 1. Verify OTP
        const { data: otpRecord, error: otpError } = await supabase
            .schema('wa')
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
            .schema('wa')
            .from('phone_otps')
            .update({ used: true })
            .eq('id', otpRecord.id)

        // 3. Find the contact and their auth user
        const { data: contact } = await supabase
            .schema('wa')
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
