import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { Users, Phone, Tag } from 'lucide-react'
import { InviteUserButton } from './invite-user-modal'
import UsersClient from './users-client'

export default async function CorporateUsersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Fetch all contacts for this company
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, phone, push_name, real_name, first_seen, last_seen, tags, nickname, trial_started_at, trial_days, user_id')
        .eq('client_company_id', activeCompany.companyId)
        .order('first_seen', { ascending: false })

    // Get membership status for each contact
    const contactIds = contacts?.map(c => c.id) || []
    let membershipMap: Record<string, any> = {}
    if (contactIds.length > 0) {
        const { data: memberships } = await supabase
            .schema('wa')
            .from('memberships')
            .select('contact_id, plan, status')
            .eq('client_company_id', activeCompany.companyId)
            .in('contact_id', contactIds)

        memberships?.forEach(m => {
            membershipMap[m.contact_id] = m
        })
    }

    // Get company info for portal URL
    const { data: companyInfo } = await supabase
        .from('client_companies')
        .select('custom_domain')
        .eq('id', activeCompany.companyId)
        .single()

    const portalDomain = companyInfo?.custom_domain || activeCompany.companyId
    const companyPortalUrl = companyInfo?.custom_domain
        ? `https://${companyInfo.custom_domain}`
        : `https://admin.autoflowai.io/${activeCompany.companyId}`

    const totalUsers = contacts?.length || 0
    const activeUsers = contacts?.filter(c => {
        const lastSeen = c.last_seen ? new Date(c.last_seen) : null
        if (!lastSeen) return false
        const daysAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo <= 7
    }).length || 0

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Usuarios</h1>
                    <p className="text-gray-500 mt-1">
                        Todos los usuarios asociados a <span className="font-semibold text-gray-700">{activeCompany.companyName}</span>
                    </p>
                </div>
                <InviteUserButton companyName={activeCompany.companyName} companyPortalUrl={companyPortalUrl} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Usuarios</p>
                        <p className="text-2xl font-black text-gray-900">{totalUsers}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-green-50 text-green-600">
                        <Phone size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Activos (7d)</p>
                        <p className="text-2xl font-black text-gray-900">{activeUsers}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                        <Tag size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Con Membresía</p>
                        <p className="text-2xl font-black text-gray-900">
                            {Object.values(membershipMap).filter((m: any) => m.status === 'active').length}
                        </p>
                    </div>
                </div>
            </div>

            <UsersClient
                    contacts={(contacts || []).map(c => ({
                        ...c,
                        has_portal_access: !!c.user_id && c.user_id !== '00000000-0000-0000-0000-000000000000',
                    }))}
                    membershipMap={membershipMap}
                    companyName={activeCompany.companyName}
                    companyPortalUrl={companyPortalUrl}
                    companyId={activeCompany.companyId}
                />
        </div>
    )
}
