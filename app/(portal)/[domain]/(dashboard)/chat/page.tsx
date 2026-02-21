import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCompanyByDomain } from '@/lib/data/companies'
import { ChatLayout } from '@/components/chat/chat-layout'
import { redirect } from 'next/navigation'

export default async function ChatPage({ params }: { params: Promise<{ domain: string }> }) {
    const supabase = await createClient()

    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/${domain}/chat`)}`)
    }

    // Resolve company from domain (supports ID or custom domain)
    const company = await getCompanyByDomain(supabase, domain)

    // Fetch contact_id for the user using the public view
    let query = supabase
        .from('wa_contacts_view')
        .select('id, company_id')
        .eq('user_id', user.id)

    // Filter by company_id if available to resolve the specific contact context
    if (company?.id) {
        query = query.eq('company_id', company.id)
    } else {
        // Fallback: if domain looks like a UUID but getCompanyByDomain failed (e.g. RLS on companies table)
        // we try to use it directly as company_id anyway
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(domain)) {
            query = query.eq('company_id', domain)
        }
    }

    let { data: contact, error } = await query
        .limit(1)
        .maybeSingle()

    if (error || !contact) {
        // Fallback for Superadmins: automatically provision a contact record so they can test the chat
        const { data: adminCheck } = await supabase
            .from('admin_profiles')
            .select('role, scope')
            .eq('auth_user_id', user.id)
            .single()

        if (adminCheck && (adminCheck.scope === 'global' || adminCheck.role === 'super_admin')) {
            const companyIdToUse = company?.id || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(domain) ? domain : null)

            if (companyIdToUse) {
                const serviceClient = createServiceClient()
                const { data: newContact, error: insertError } = await serviceClient
                    .from('wa_contacts')
                    .insert({
                        company_id: companyIdToUse,
                        user_id: user.id,
                        name: 'Admin - ' + (user.email?.split('@')[0] || 'User'),
                        wa_id: 'admin_' + user.id.substring(0, 8),
                    })
                    .select('id, company_id')
                    .single()

                if (!insertError && newContact) {
                    contact = newContact
                }
            }
        }
    }

    if (!contact) {
        console.error('Chat access error:', error)
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Error: Contact not found</h1>
                <p>User ID: {user.id}</p>
                <p>Company Context: {company?.id || domain}</p>
                <p>Status: {error?.message || 'No matching contact record found for this company.'}</p>
                <p className="mt-4 text-gray-600">Please refresh or contact support.</p>
            </div>
        )
    }

    // Resolve the tenant (client_company_id) to fetch agents
    // Agents are typically defined at the Client Company level, while the contact is at the Project level.
    // We try to find the parent client_company_id.
    let agentSourceId = contact.company_id

    const { data: project } = await supabase
        .from('companies')
        .select('client_company_id')
        .eq('id', contact.company_id)
        .single()

    if (project?.client_company_id) {
        agentSourceId = project.client_company_id
    }

    console.log(`[ChatPage] Fetching agents for Source ID: ${agentSourceId} (Original: ${contact.company_id})`)

    const serviceClient = createServiceClient()

    // Fetch agents for the company (using the resolved tenant ID)
    const { data: agents, error: agentsError } = await serviceClient
        .from('company_prompts')
        .select('*')
        .eq('company_id', agentSourceId)
        .eq('active', true)
        .order('agent_name', { ascending: true })

    if (agentsError) {
        console.error('[ChatPage] Error fetching agents:', agentsError)
    } else {
        console.log(`[ChatPage] Found ${agents?.length} agents`)
    }

    return (
        <ChatLayout
            agents={agents || []}
            contactId={contact.id}
            companyId={contact.company_id}
        />
    )
}
