'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export async function inviteUser(formData: FormData) {
    const supabase = await createClient()

    // 1. Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (roleData?.role !== 'admin') {
        return { error: 'Unauthorized: Only admins can invite users' }
    }

    // 2. Get form data
    const email = formData.get('email') as string
    const role = formData.get('role') as 'admin' | 'basic'

    if (!email || !role) {
        return { error: 'Email and role are required' }
    }

    // 3. Check if user already exists
    const supabaseAdmin = await createAdminClient()
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = users.find(u => u.email === email)

    if (existingUser) {
        // User exists. The admin wants to "resend" (re-invite), implying a reset.
        // We delete the existing user to allow a fresh invitation link to be generated.
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id)

        if (deleteError) {
            console.error('Error deleting existing user:', deleteError)
            return { error: 'Error al eliminar el usuario existente para re-invitar: ' + deleteError.message }
        }
    }

    // 4. Create the user first with a temporary password, then send recovery link
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm the email
    });

    if (createError) {
        console.error('Create user error:', createError);
        return { error: 'Error al crear el usuario: ' + createError.message };
    }

    // Now generate a recovery/password reset link
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: `${origin}/administracion/update-password`
        }
    })

    if (inviteError) {
        console.error('Invite error:', inviteError)
        return { error: 'Error al generar la invitación: ' + inviteError.message }
    }

    if (!inviteData.properties?.action_link) {
        return { error: 'No se pudo generar el enlace de invitación' }
    }

    const verifyLink = inviteData.properties.action_link;

    // 5. Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        return { error: 'Error de configuración: RESEND_API_KEY no encontrada' }
    }

    try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);

        const { error: emailError } = await resend.emails.send({
            from: 'Dental Corbella <no-reply@brandboost-ai.com>', // Or your verified domain
            to: [email],
            subject: 'Configura tu contraseña - Smile Forward',
            html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .email-wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #000; text-align: center; padding: 40px 20px; }
        .header img { max-width: 200px; height: auto; }
        .content { padding: 40px 30px; }
        h1 { font-size: 24px; font-weight: 600; margin-bottom: 20px; color: #000; }
        p { margin-bottom: 15px; color: #555; }
        .highlight-box { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; }
        .cta-container { text-align: center; }
        .cta-button { display: inline-block; padding: 16px 32px; background-color: #000; color: #fff !important; text-decoration: none; border-radius: 50px; font-weight: 500; margin: 20px 0; }
        .footer { text-align: center; padding: 30px 20px; border-top: 2px solid #f0f0f0; color: #999; font-size: 14px; }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="header">
            <img src="https://dentalcorbella.com/wp-content/uploads/2023/07/logo-white-trans2.png" alt="Dental Corbella">
        </div>
        
        <div class="content">
            <h1>¡Hola! 👋</h1>
            
            <p>Has sido invitado a **Smile Forward** como **${role === 'admin' ? 'Administrador' : 'Usuario Básico'}**.</p>
            
            <div class="highlight-box">
                <p><strong>Configura tu acceso</strong></p>
                <p>Haz clic en el botón de abajo para establecer tu contraseña y acceder al panel.</p>
            </div>
            
            <div class="cta-container">
                <a href="${verifyLink}" class="cta-button">
                    Aceptar Invitación
                </a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #999;">
                Si no esperabas esta invitación, puedes ignorar este correo.
            </p>
        </div>
        
        <div class="footer">
            <p>Dental Corbella - Smile Forward</p>
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
        </div>
    </div>
</body>
</html>`
        });

        if (emailError) {
            console.error('Resend error:', emailError)
            return { error: 'Error al enviar el correo: ' + emailError.message }
        }

    } catch (err: any) {
        console.error('Email sending failed:', err)
        return { error: 'Fallo crítico al enviar correo: ' + err.message }
    }

    // 6. Assign role in user_roles table
    // We already have inviteData.user from generateLink
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
            user_id: inviteData.user.id,
            role: role
        }, { onConflict: 'user_id' })

    if (roleError) {
        console.error('Role assignment error:', roleError)
        return { error: 'Usuario invitado pero falló la asignación de rol: ' + roleError.message }
    }

    revalidatePath('/administracion/settings')
    return { success: true, message: `Invitación enviada a ${email} como ${role}` }
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function createAdminClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
