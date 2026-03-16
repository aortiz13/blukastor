import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
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

        const { searchParams } = new URL(request.url)
        const contactId = searchParams.get('contactId')
        if (!contactId) {
            return NextResponse.json({ error: 'contactId required' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Fetch contact
        const { data: contact } = await serviceClient
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .eq('client_company_id', companyId)
            .single()

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
        }

        // Fetch membership
        const { data: membership } = await serviceClient
            .schema('wa')
            .from('memberships')
            .select('plan, status, started_at, expires_at, notes')
            .eq('contact_id', contactId)
            .eq('client_company_id', companyId)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        // Fetch compliance
        const { data: compliance } = await serviceClient
            .from('user_compliance')
            .select('terms_accepted, accepted_at')
            .eq('contact_id', contactId)
            .eq('client_company_id', companyId)
            .limit(1)
            .maybeSingle()

        // Fetch AI status
        const { data: aiStatus } = await serviceClient
            .from('ai_enabled')
            .select('ai_enabled')
            .eq('contact_id', contactId)
            .eq('company_id', companyId)
            .maybeSingle()

        return NextResponse.json({
            contact: {
                id: contact.id,
                phone: contact.phone,
                push_name: contact.push_name,
                real_name: contact.real_name,
                nickname: contact.nickname,
                first_seen: contact.first_seen,
                last_seen: contact.last_seen,
                tags: contact.tags,
                notes: contact.notes,
                user_id: contact.user_id,
            },
            membership: membership || null,
            compliance: compliance || null,
            aiEnabled: aiStatus?.ai_enabled ?? true, // default true if no row
        })
    } catch (error: any) {
        console.error('Error in GET /api/corporate/user-details:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
