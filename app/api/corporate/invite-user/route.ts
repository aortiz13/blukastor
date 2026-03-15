import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Resolve admin's company
        const { data: admins } = await supabase
            .from('admin_profiles')
            .select('company_id, role, scope')
            .eq('auth_user_id', user.id)

        if (!admins || admins.length === 0) {
            return NextResponse.json({ error: 'No admin access' }, { status: 403 })
        }

        const isSuperAdmin = admins.some((a: any) => a.scope === 'global' || a.role === 'super_admin')

        // Resolve company ID
        let companyId: string | null = null
        if (isSuperAdmin) {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            companyId = cookieStore.get('corporate_company_id')?.value || null
        }
        if (!companyId) {
            const instanceAdmin = admins.find((a: any) => a.company_id)
            companyId = instanceAdmin?.company_id || null
        }
        if (!companyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        // Check permission (must be admin or super_admin)
        const match = admins.find((a: any) => a.company_id === companyId)
        const role = isSuperAdmin ? 'super_admin' : match?.role
        if (!['admin', 'super_admin'].includes(role || '')) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
        }

        const body = await request.json()
        const { email, phone, role: inviteRole, channel, permissions } = body

        if (!channel || !['email', 'link', 'whatsapp'].includes(channel)) {
            return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
        }
        if (!inviteRole || !['admin', 'member', 'client'].includes(inviteRole)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        // If member role, permissions should be provided (module-based)
        const memberPermissions = inviteRole === 'member' ? (permissions || {
            modules: [],
        }) : {}
        if (channel === 'email' && !email) {
            return NextResponse.json({ error: 'Email required for email invitations' }, { status: 400 })
        }
        if (channel === 'whatsapp' && !phone) {
            return NextResponse.json({ error: 'Phone number required for WhatsApp invitations' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Check for existing invite with same email
        if (channel === 'email' && email) {
            const { data: existing } = await serviceClient
                .from('portal_invites')
                .select('id')
                .eq('client_company_id', companyId)
                .eq('email', email)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle()

            if (existing) {
                return NextResponse.json({ error: 'Ya existe una invitación pendiente para este email' }, { status: 409 })
            }
        }

        // Create invite
        const token = uuidv4()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        const { data: invite, error: insertError } = await serviceClient
            .from('portal_invites')
            .insert({
                client_company_id: companyId,
                email: channel === 'email' ? email : null,
                token,
                role: inviteRole,
                channel,
                permissions: memberPermissions,
                expires_at: expiresAt.toISOString(),
                created_by: user.id,
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating portal invite:', insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        // Get company details for the email
        const { data: company } = await serviceClient
            .from('client_companies')
            .select('name, custom_domain')
            .eq('id', companyId)
            .single()

        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'autoflowai.io'

        // Members/Admins → corporate portal, Clients → company client portal
        let inviteUrl: string
        if (inviteRole === 'client' && company?.custom_domain) {
            inviteUrl = `https://${company.custom_domain}/portal-invite/${token}`
        } else {
            inviteUrl = `https://admin.${rootDomain}/portal-invite/${token}`
        }

        // Send email if channel is email
        if (channel === 'email' && email) {
            try {
                await supabase.functions.invoke('send-portal-invite', {
                    body: {
                        email,
                        companyName: company?.name || 'Portal',
                        senderName: user.user_metadata?.full_name || user.email,
                        inviteLink: inviteUrl,
                        role: inviteRole,
                    }
                })
            } catch (emailError) {
                console.error('Error sending invite email (non-blocking):', emailError)
            }
        }

        // Send WhatsApp message if channel is whatsapp
        if (channel === 'whatsapp' && phone) {
            try {
                const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`
                await supabase.functions.invoke('send-whatsapp-invite', {
                    body: {
                        phone: normalizedPhone,
                        inviteUrl,
                        companyName: company?.name || 'la plataforma',
                        role: inviteRole,
                    }
                })
            } catch (waError) {
                console.error('Error sending WhatsApp invite (non-blocking):', waError)
            }
        }

        return NextResponse.json({
            success: true,
            token,
            inviteUrl,
        })
    } catch (error: any) {
        console.error('Error in POST /api/corporate/invite-user:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// GET — List pending invites for the company
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: admins } = await supabase
            .from('admin_profiles')
            .select('company_id, role, scope')
            .eq('auth_user_id', user.id)

        if (!admins || admins.length === 0) {
            return NextResponse.json({ error: 'No admin access' }, { status: 403 })
        }

        const isSuperAdmin = admins.some((a: any) => a.scope === 'global' || a.role === 'super_admin')
        let companyId: string | null = null
        if (isSuperAdmin) {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            companyId = cookieStore.get('corporate_company_id')?.value || null
        }
        if (!companyId) {
            const instanceAdmin = admins.find((a: any) => a.company_id)
            companyId = instanceAdmin?.company_id || null
        }
        if (!companyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        const serviceClient = createServiceClient()
        const { data: invites, error } = await serviceClient
            .from('portal_invites')
            .select('*')
            .eq('client_company_id', companyId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ invites })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
