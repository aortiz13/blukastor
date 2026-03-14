import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/forgot-password
 * 
 * Uses Supabase Admin API to generate a recovery link, then sends the email
 * via the send-company-invite edge function (Resend) to bypass the broken
 * send-email auth hook.
 */
export async function POST(request: Request) {
    try {
        const { email, redirectUrl } = await request.json()

        if (!email) {
            return NextResponse.json(
                { error: 'El correo electrónico es requerido' },
                { status: 400 }
            )
        }

        const origin = new URL(request.url).origin
        const resetRedirectTo = redirectUrl || `${origin}/reset-password`

        // Use admin client to generate recovery link (does NOT send email)
        const supabaseAdmin = createServiceClient()

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: resetRedirectTo,
            }
        })

        if (linkError) {
            console.error('Error generating recovery link:', linkError)
            // Always return success to avoid user enumeration
            return NextResponse.json({
                success: true,
                message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
            })
        }

        const recoveryLink = linkData.properties?.action_link

        if (!recoveryLink) {
            console.error('No action_link returned from generateLink')
            return NextResponse.json({
                success: true,
                message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
            })
        }

        // Send recovery email via edge function (Resend)
        const supabase = await createClient()

        try {
            await supabase.functions.invoke('send-company-invite', {
                body: {
                    email,
                    companyName: 'Blukastor',
                    senderName: 'Soporte',
                    inviteLink: recoveryLink,
                    role: 'recovery',
                    isPasswordRecovery: true,
                }
            })
        } catch (emailError) {
            console.error('Error sending recovery email via edge function:', emailError)
            // Don't fail — the link was generated, just email delivery failed
        }

        return NextResponse.json({
            success: true,
            message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
        })
    } catch (error: any) {
        console.error('Error in forgot-password:', error)
        return NextResponse.json(
            { error: error.message || 'Error interno' },
            { status: 500 }
        )
    }
}
