import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/change-password
 * Allows an authenticated user to change their password.
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }

        const { newPassword } = await request.json()

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { error: 'La contraseña debe tener al menos 6 caracteres' },
                { status: 400 }
            )
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        })

        if (error) {
            console.error('Error changing password:', error)

            // Handle the "same password" case
            if (error.message.includes('same')) {
                return NextResponse.json(
                    { error: 'La nueva contraseña debe ser diferente a la actual' },
                    { status: 400 }
                )
            }

            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Contraseña actualizada exitosamente' })
    } catch (error: any) {
        console.error('Error in change-password:', error)
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
    }
}
