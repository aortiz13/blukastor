import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { ProfileForm } from '@/components/profile/profile-form'

export default async function CorporateProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/corporate/login')

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    const serviceClient = createServiceClient()

    // Find or create a contact for this user in the active company
    let contactId: string | null = null

    const { data: existingContact } = await serviceClient
        .from('wa_contacts_view')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', activeCompany.companyId)
        .maybeSingle()

    if (existingContact) {
        contactId = existingContact.id
    } else {
        // Create one via the upsert function to avoid schema issues
        const { error } = await serviceClient.rpc('upsert_wa_admin', {
            p_auth_user_id: user.id,
            p_client_company_id: activeCompany.companyId,
            p_role: 'member',
            p_scope: 'instance',
            p_attributes: {},
            p_note: 'Auto-created for profile access',
        })

        // The trigger auto_link_admin_to_portal will have created a contact
        const { data: newContact } = await serviceClient
            .from('wa_contacts_view')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_id', activeCompany.companyId)
            .maybeSingle()

        contactId = newContact?.id || null
    }

    if (!contactId) {
        return (
            <div className="p-8 text-red-500">
                <h1 className="text-xl font-bold">Error</h1>
                <p>No se pudo encontrar o crear tu perfil. Contacta al administrador.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <ProfileForm contactId={contactId} companyId={activeCompany.companyId} />
            </div>
        </div>
    )
}
