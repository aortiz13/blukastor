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
        const { email, password, phone, contactId, companyId: rawCompanyId, domain } = await request.json()

        if (!email || !password || !phone || !contactId) {
            return NextResponse.json(
                { error: 'Email, contraseña, teléfono y contactId son requeridos' },
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

        // 1. Verify the contact exists and matches
        const { data: contact } = await supabase
            .from('contacts')
            .select('id, user_id, phone, client_company_id')
            .eq('id', contactId)
            .eq('phone', normalizedPhone)
            .eq('client_company_id', companyId)
            .single()

        if (!contact) {
            return NextResponse.json(
                { error: 'Contacto no encontrado o no coincide' },
                { status: 404 }
            )
        }

        // Treat nil UUID as no user
        const NIL_UUID = '00000000-0000-0000-0000-000000000000'
        const hasRealUser = contact.user_id && contact.user_id !== NIL_UUID

        // If the contact already has a real user, just log them in
        if (hasRealUser) {
            const { data: { user: existingUser } } = await supabase.auth.admin.getUserById(contact.user_id)

            if (existingUser?.email) {
                const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
                    type: 'magiclink',
                    email: existingUser.email,
                })

                if (!linkError && linkData) {
                    return NextResponse.json({
                        success: true,
                        redirectUrl: linkData.properties?.action_link || null,
                        message: 'Ya tienes una cuenta. Iniciando sesión...',
                        alreadyRegistered: true,
                    })
                }
            }

            return NextResponse.json(
                { error: 'Este contacto ya tiene un usuario asociado. Intenta iniciar sesión con tu email.' },
                { status: 400 }
            )
        }

        // 2. Create user in Supabase Auth
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            phone: normalizedPhone,
            email_confirm: true, // Auto-confirm since they verified via OTP
            user_metadata: {
                phone: normalizedPhone,
                contact_id: contactId,
                company_id: companyId,
            },
        })

        if (createError) {
            console.error('Error creating user:', createError)
            return NextResponse.json(
                { error: createError.message || 'Error al crear usuario' },
                { status: 500 }
            )
        }

        const userId = authData.user.id

        // 3. Link the contact to the new user by updating user_id
        const { error: updateError } = await supabase
            .from('contacts')
            .update({ user_id: userId })
            .eq('id', contactId)

        if (updateError) {
            console.error('Error linking contact to user:', updateError)
            // Don't fail the whole flow — user was created
        }

        // 4. Generate magic link to auto-login
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })

        if (linkError) {
            console.error('Error generating magic link:', linkError)
            return NextResponse.json(
                { error: 'Usuario creado pero error al generar sesión. Intenta iniciar sesión con email y contraseña.' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            redirectUrl: linkData.properties?.action_link || null,
            message: '¡Cuenta creada exitosamente!',
        })

    } catch (error: any) {
        console.error('Error in phone-register:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno' },
            { status: 500 }
        )
    }
}
