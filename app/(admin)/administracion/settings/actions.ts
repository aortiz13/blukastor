'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

    // 3. Invite user via Supabase Auth Admin API
    // Note: createClient() from utils/supabase/server typically uses standard anon/service keys. 
    // For admin actions, we need a client with SERVICE_ROLE_KEY to bypass RLS and use admin auth endpoints.
    // We need to initialize a service role client here.

    const supabaseAdmin = await createAdminClient()

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
        console.error('Invite error:', inviteError)
        return { error: inviteError.message }
    }

    if (!inviteData.user) {
        return { error: 'Failed to create user invite' }
    }

    // 4. Assign role in user_roles table
    const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
            user_id: inviteData.user.id,
            role: role
        })

    if (roleError) {
        console.error('Role assignment error:', roleError)
        // Optional: Delete the invited user if role assignment fails? 
        // For now, return error.
        return { error: 'User invited but failed to assign role: ' + roleError.message }
    }

    revalidatePath('/administracion/settings')
    return { success: true, message: `Invitation sent to ${email} as ${role}` }
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
