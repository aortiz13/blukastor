import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/corporate/invite-register
 * Creates a new user account for an invited user (bypasses email confirmation).
 * The invite token is validated before creating the user.
 */
export async function POST(request: Request) {
    try {
        const { email, password, token } = await request.json()

        if (!email || !password || !token) {
            return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Validate the invite token
        const { data: invite, error: inviteError } = await supabase
            .from('portal_invites')
            .select('id, role, client_company_id, expires_at')
            .eq('token', token)
            .single()

        if (inviteError || !invite) {
            return NextResponse.json({ error: 'Token de invitación no válido' }, { status: 400 })
        }

        if (new Date(invite.expires_at) < new Date()) {
            return NextResponse.json({ error: 'La invitación ha expirado' }, { status: 400 })
        }

        // 2. Create the user via admin API (bypasses email hook & auto-confirms)
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm since they have a valid invite token
            user_metadata: {
                invite_token: token,
            },
        })

        if (createError) {
            // If user already exists, try returning a helpful message
            if (createError.message.includes('already') || createError.message.includes('exists')) {
                return NextResponse.json({
                    error: 'Este correo ya está registrado. Usa "Iniciar Sesión" con tu contraseña.',
                    existing: true,
                }, { status: 409 })
            }
            console.error('Error creating user:', createError)
            return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            userId: userData.user?.id,
        })
    } catch (error: any) {
        console.error('Error in invite-register:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
