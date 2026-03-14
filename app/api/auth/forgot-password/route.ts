import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/forgot-password
 * Sends a password recovery email to the user via Supabase Auth.
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

        const supabase = await createClient()

        // Build the redirect URL for the password reset link
        const origin = new URL(request.url).origin
        const resetRedirectTo = redirectUrl || `${origin}/reset-password`

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: resetRedirectTo,
        })

        if (error) {
            console.error('Error sending password reset email:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        // Always return success to avoid user enumeration
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
