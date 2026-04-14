import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: companyId } = await params

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
        const { email, role = 'viewer' } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Fetch company details (including branding for dynamic emails)
        const { data: company } = await supabase
            .from('client_companies')
            .select('name, custom_domain, logo_url, primary_color, secondary_color')
            .eq('id', companyId)
            .single()

        const companyName = company?.name || 'Portal'
        const companyDomain = company?.custom_domain || null
        const companyLogoUrl = company?.logo_url || ''
        const companyPrimaryColor = company?.primary_color || '#6366f1'
        const companySecondaryColor = company?.secondary_color || '#8b5cf6'
        const senderName = user.user_metadata?.full_name || user.email || 'Administrador'

        let redirectUrl: string
        if (companyDomain) {
            redirectUrl = `https://${companyDomain}/login`
        } else {
            redirectUrl = `${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'https://admin.autoflowai.io'}/login`
        }

        // Check if user exists in auth.users
        const { data: existingAuthUser } = await supabase
            .rpc('get_user_by_email', { user_email: email })

        let authUserId: string

        if (existingAuthUser && existingAuthUser.length > 0) {
            authUserId = existingAuthUser[0].id

            // Check if already associated with this company
            const { data: existingAdmin } = await supabase
                .from('admin_profiles')
                .select('auth_user_id')
                .eq('auth_user_id', authUserId)
                .eq('company_id', companyId)
                .single()

            if (existingAdmin) {
                return NextResponse.json(
                    { error: 'El usuario ya está asociado a esta empresa' },
                    { status: 400 }
                )
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

            return NextResponse.json({
                success: true,
                admin,
                message: `Usuario agregado exitosamente a ${companyName}`
            })
        } else {
            // User doesn't exist — generate invite link + send custom email
            const supabaseAdmin = createServiceClient()

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
                        const { data: alreadyAdmin } = await supabase
                            .from('admin_profiles')
                            .select('auth_user_id')
                            .eq('auth_user_id', existingUser.id)
                            .eq('company_id', companyId)
                            .single()

                        if (alreadyAdmin) {
                            return NextResponse.json(
                                { error: 'El usuario ya está asociado a esta empresa' },
                                { status: 400 }
                            )
                        }

                        const { data: admin, error: adminError } = await supabase
                            .from('admin_profiles')
                            .insert({
                                auth_user_id: existingUser.id,
                                company_id: companyId,
                                role,
                                scope: 'instance'
                            })
                            .select()
                            .single()

                        if (adminError) {
                            return NextResponse.json({ error: adminError.message }, { status: 500 })
                        }

                        return NextResponse.json({
                            success: true,
                            admin,
                            message: `Usuario agregado exitosamente a ${companyName}`
                        })
                    }
                }

                console.error('Error generating invite link:', linkError)
                return NextResponse.json({ error: 'Error al invitar usuario: ' + linkError.message }, { status: 500 })
            }

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
                        logoUrl: companyLogoUrl,
                        primaryColor: companyPrimaryColor,
                        secondaryColor: companySecondaryColor,
                    }
                })
            } catch (emailError) {
                console.error('Error sending invite email (non-blocking):', emailError)
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
                console.error('Error creating admin after invite:', adminError)
                return NextResponse.json({ error: adminError.message }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                admin,
                message: `Invitación enviada y usuario agregado a ${companyName}`
            })
        }
    } catch (error: any) {
        console.error('Error in POST /api/admin/companies/[id]/users:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
