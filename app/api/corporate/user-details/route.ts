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

        const { data: admins } = await supabase
            .from('admin_profiles')
            .select('company_id, role, scope')
            .eq('auth_user_id', user.id)

        if (!admins || admins.length === 0) {
            return NextResponse.json({ error: 'No admin access' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const contactId = searchParams.get('contactId')
        if (!contactId) {
            return NextResponse.json({ error: 'contactId required' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Use public.contacts view (mirrors wa.contacts without needing .schema('wa'))
        let contact: any = null

        const { data: directContact, error: directError } = await serviceClient
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .maybeSingle()

        if (directContact) {
            contact = directContact
        } else {
            const { data: userContact } = await serviceClient
                .from('contacts')
                .select('*')
                .eq('user_id', contactId)
                .limit(1)
                .maybeSingle()
            if (userContact) contact = userContact
        }

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found', debug: { contactId, err: directError?.message } }, { status: 404 })
        }

        const companyId = contact.client_company_id

        let membership = null
        if (companyId) {
            const { data: m } = await serviceClient.schema('wa').from('memberships')
                .select('plan, status, started_at, expires_at, notes')
                .eq('contact_id', contact.id).eq('client_company_id', companyId)
                .order('started_at', { ascending: false }).limit(1).maybeSingle()
            membership = m
        }

        let compliance = null
        if (companyId) {
            const { data: c } = await serviceClient.from('user_compliance')
                .select('terms_accepted, accepted_at')
                .eq('contact_id', contact.id).eq('client_company_id', companyId)
                .limit(1).maybeSingle()
            compliance = c
        }

        let aiEnabled = true
        if (companyId) {
            const { data: ai } = await serviceClient.from('ai_enabled')
                .select('ai_enabled')
                .eq('contact_id', contact.id).eq('company_id', companyId)
                .maybeSingle()
            if (ai) aiEnabled = ai.ai_enabled
        }

        return NextResponse.json({
            contact: {
                id: contact.id, phone: contact.phone, push_name: contact.push_name,
                real_name: contact.real_name, nickname: contact.nickname,
                first_seen: contact.first_seen, last_seen: contact.last_seen,
                tags: contact.tags, notes: contact.notes, user_id: contact.user_id,
            },
            membership, compliance, aiEnabled,
        })
    } catch (error: any) {
        console.error('Error in GET /api/corporate/user-details:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
