import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCompanyByDomain } from '@/lib/data/companies'
import { ProfileForm } from '@/components/profile/profile-form'
import { redirect } from 'next/navigation'

export default async function ProfilePage({ params }: { params: Promise<{ domain: string }> }) {
    const supabase = await createClient()
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)

    // Resolve company from domain
    const company = await getCompanyByDomain(supabase, domain)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/${domain}/profile`)}`)
    }

    // Fetch contact_id for the user
    let query = supabase
        .from('wa_contacts_view') // Use the public view
        .select('id, company_id')
        .eq('user_id', user.id)

    // Filter by company_id if available to resolve the specific contact context
    if (company?.id) {
        query = query.eq('company_id', company.id)
    } else {
        // Fallback: if domain looks like a UUID but getCompanyByDomain failed
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(domain)) {
            query = query.eq('company_id', domain)
        }
    }

    let { data: contact, error } = await query
        .limit(1)
        .maybeSingle()

    if (error || !contact) {
        // Fallback for Superadmins: automatically provision a contact record
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
                    .from('contacts')
                    .insert({
                        client_company_id: companyIdToUse,
                        user_id: user.id,
                        push_name: 'Admin - ' + (user.email?.split('@')[0] || 'User'),
                        phone: 'admin_' + user.id.substring(0, 8),
                    })
                    .select('id, client_company_id')
                    .single()

                if (insertError) {
                    const { data: waContact, error: waError } = await serviceClient
                        .schema('wa')
                        .from('contacts')
                        .insert({
                            client_company_id: companyIdToUse,
                            user_id: user.id,
                            push_name: 'Admin - ' + (user.email?.split('@')[0] || 'User'),
                            phone: 'admin_' + user.id.substring(0, 8),
                        })
                        .select('id, client_company_id')
                        .single()

                    if (!waError && waContact) {
                        contact = {
                            id: waContact.id,
                            company_id: waContact.client_company_id
                        }
                    } else {
                        console.error('Failed to create admin contact in wa config:', waError || insertError)
                    }
                } else if (newContact) {
                    contact = {
                        id: newContact.id,
                        company_id: newContact.client_company_id
                    }
                }
            }
        }
    }

    if (!contact) {
        console.error('Profile access error:', error)
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Error: Contact not found</h1>
                <p>No se pudo encontrar tu registro de contacto. Por favor, contacta a soporte.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <ProfileForm contactId={contact.id} companyId={contact.company_id} />
            </div>
        </div>
    )
}
