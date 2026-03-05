import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check if user is super admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminCheck } = await supabase
            .from('admin_profiles')
            .select('role, scope')
            .eq('auth_user_id', user.id)
            .single()

        if (!adminCheck || (adminCheck.scope !== 'global' && adminCheck.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Forbidden: Super admin privileges required' }, { status: 403 })
        }

        // Parse request body
        const body = await request.json()
        const { email, companyId, role = 'viewer', projectIds } = body

        if (!email || !companyId) {
            return NextResponse.json({ error: 'Email and companyId are required' }, { status: 400 })
        }

        // Fetch company details
        const { data: company } = await supabase
            .from('client_companies')
            .select('name, custom_domain')
            .eq('id', companyId)
            .single()

        const companyName = company?.name || 'Portal'
        const companyDomain = company?.custom_domain || null

        // Build redirect URL based on company domain
        let redirectUrl: string
        if (companyDomain) {
            redirectUrl = `https://${companyDomain}/login`
        } else {
            redirectUrl = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'https://admin.autoflowai.io'}/login`
        }

        const senderName = user.user_metadata?.full_name || user.email || 'Administrador'

        // Service client for admin operations
        const supabaseAdmin = createServiceClient()

        // --- Resolve auth user ---
        let authUserId: string | null = null

        const { data: rpcResult } = await supabase
            .rpc('get_user_by_email', { user_email: email })

        if (rpcResult && rpcResult.length > 0) {
            authUserId = rpcResult[0].id
        }

        // --- Handle based on whether user exists ---
        if (authUserId) {
            // User already exists — add to company AND send notification email
            const result = await addUserToCompany(supabase, authUserId, companyId, role, projectIds, companyName)

            // Send notification email to existing user
            try {
                const loginUrl = companyDomain
                    ? `https://${companyDomain}/login`
                    : `${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'https://admin.autoflowai.io'}/login`

                await supabase.functions.invoke('send-company-invite', {
                    body: {
                        email,
                        companyName,
                        senderName,
                        inviteLink: loginUrl,
                        role,
                        companyDomain,
                    }
                })
            } catch (emailError) {
                console.error('Error sending notification email (non-blocking):', emailError)
            }

            return result
        }

        // --- User might not exist OR RPC didn't find them ---
        // Try to generate an invite link (creates user if needed, does NOT send email)
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email,
            options: {
                redirectTo: redirectUrl,
                data: {
                    company_name: companyName,
                    company_id: companyId,
                    invited_role: role,
                }
            }
        })

        if (linkError) {
            // If user already registered, find and add them
            if (linkError.message?.includes('already been registered') ||
                linkError.message?.includes('already exists')) {

                const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
                const existingUser = users?.find(
                    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
                )

                if (existingUser) {
                    const result = await addUserToCompany(supabase, existingUser.id, companyId, role, projectIds, companyName)

                    // Send notification email to existing user
                    try {
                        const loginUrl = companyDomain
                            ? `https://${companyDomain}/login`
                            : `${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'https://admin.autoflowai.io'}/login`

                        await supabase.functions.invoke('send-company-invite', {
                            body: {
                                email,
                                companyName,
                                senderName,
                                inviteLink: loginUrl,
                                role,
                                companyDomain,
                            }
                        })
                    } catch (emailError) {
                        console.error('Error sending notification email (non-blocking):', emailError)
                    }

                    return result
                }
            }

            console.error('Error generating invite link:', linkError)
            return NextResponse.json(
                { error: 'Error al generar invitación: ' + linkError.message },
                { status: 500 }
            )
        }

        // Get the generated invite link and user ID
        const inviteLink = linkData.properties?.action_link || redirectUrl
        authUserId = linkData.user.id

        // Send custom email via Edge Function (Resend)
        try {
            await supabase.functions.invoke('send-company-invite', {
                body: {
                    email,
                    companyName,
                    senderName,
                    inviteLink,
                    role,
                    companyDomain,
                }
            })
        } catch (emailError) {
            console.error('Error sending invite email (non-blocking):', emailError)
            // Don't fail the request, the user was created successfully
        }

        // Add to company
        return await addUserToCompany(supabase, authUserId, companyId, role, projectIds, companyName, true)

    } catch (error: any) {
        console.error('Error in POST /api/admin/users/invite:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * Helper: add a user to a company via admin_profiles + optional project memberships
 */
async function addUserToCompany(
    supabase: any,
    authUserId: string,
    companyId: string,
    role: string,
    projectIds: string[] | undefined,
    companyName: string,
    wasInvited: boolean = false
) {
    // Check if already associated with this company
    const { data: existingAdmin } = await supabase
        .from('admin_profiles')
        .select('auth_user_id')
        .eq('auth_user_id', authUserId)
        .eq('company_id', companyId)
        .single()

    if (existingAdmin) {
        return NextResponse.json({
            success: true,
            alreadyAssociated: true,
            admin: existingAdmin,
            message: `El usuario ya está asociado a ${companyName}. Se reenvió la notificación.`
        })
    }

    // Add to company
    const { data: admin, error: adminError } = await supabase
        .from('admin_profiles')
        .insert({
            auth_user_id: authUserId,
            company_id: companyId,
            role,
            scope: 'instance'
        })
        .select()
        .single()

    if (adminError) {
        console.error('Error creating admin:', adminError)
        return NextResponse.json({ error: adminError.message }, { status: 500 })
    }

    // Add project memberships if specified
    if (projectIds && projectIds.length > 0) {
        const projectMemberships = projectIds.map((projectId: string) => ({
            project_id: projectId,
            user_id: authUserId,
            role: role === 'admin' ? 'admin' : 'member'
        }))

        const { error: projectError } = await supabase
            .from('project_members')
            .insert(projectMemberships)

        if (projectError) {
            console.error('Error adding project memberships:', projectError)
        }
    }

    const message = wasInvited
        ? `Invitación enviada y usuario agregado a ${companyName}`
        : `Usuario agregado exitosamente a ${companyName}`

    return NextResponse.json({
        success: true,
        admin,
        message
    })
}
