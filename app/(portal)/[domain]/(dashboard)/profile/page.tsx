import { createClient } from '@/lib/supabase/server'
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

    const { data: contact, error } = await query
        .limit(1)
        .maybeSingle()

    if (error || !contact) {
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
