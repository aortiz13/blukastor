import { SupabaseClient } from '@supabase/supabase-js'

export interface CorporateAdmin {
    auth_user_id: string
    company_id: string
    company_name: string
    role: string
    scope: string
    note: string | null
    attributes: any
}

/**
 * Get the corporate admin profile for the current user.
 * Returns all admin entries for the user (they may admin multiple companies).
 */
export async function getCorporateAdminProfile(
    supabase: SupabaseClient,
    userId: string
): Promise<{ admins: CorporateAdmin[]; error: string | null }> {
    const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('auth_user_id', userId)

    if (error) {
        return { admins: [], error: error.message }
    }

    if (!data || data.length === 0) {
        return { admins: [], error: 'No admin access' }
    }

    return { admins: data as CorporateAdmin[], error: null }
}

/**
 * Determine the active company for a corporate admin.
 * - Super admins (scope=global): use selectedCompanyId or first company
 * - Instance admins: use their single company_id
 */
export function resolveActiveCompany(
    admins: CorporateAdmin[],
    selectedCompanyId?: string | null
): { companyId: string; companyName: string; isSuperAdmin: boolean } | null {
    if (!admins.length) return null

    const isSuperAdmin = admins.some(a => a.scope === 'global' || a.role === 'super_admin')

    if (isSuperAdmin && selectedCompanyId) {
        const found = admins.find(a => a.company_id === selectedCompanyId)
        if (found) {
            return { companyId: found.company_id, companyName: found.company_name, isSuperAdmin }
        }
    }

    // For instance admins, use the first non-global entry
    const instanceAdmin = admins.find(a => a.scope === 'instance') || admins[0]
    return {
        companyId: instanceAdmin.company_id,
        companyName: instanceAdmin.company_name,
        isSuperAdmin,
    }
}

/**
 * Fetch dashboard metrics for a specific client_company_id
 */
export async function getCorporateMetrics(supabase: SupabaseClient, companyId: string) {
    const [usersRes, membershipsRes, complianceRes, plansRes] = await Promise.all([
        supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('client_company_id', companyId),
        supabase
            .from('memberships')
            .select('id', { count: 'exact', head: true })
            .eq('client_company_id', companyId)
            .eq('status', 'active'),
        supabase
            .from('user_compliance')
            .select('id, terms_accepted', { count: 'exact' })
            .eq('client_company_id', companyId),
        supabase
            .schema('wa')
            .from('membership_plans')
            .select('id', { count: 'exact', head: true })
            .eq('client_company_id', companyId),
    ])

    const totalUsers = usersRes.count || 0
    const activeMemberships = membershipsRes.count || 0
    const totalPlans = plansRes.count || 0

    // Calculate compliance rate
    const complianceData = complianceRes.data || []
    const totalCompliance = complianceData.length
    const acceptedCompliance = complianceData.filter((c: any) => c.terms_accepted).length
    const complianceRate = totalCompliance > 0 ? Math.round((acceptedCompliance / totalCompliance) * 100) : 0

    return {
        totalUsers,
        activeMemberships,
        complianceRate,
        totalCompliance,
        acceptedCompliance,
        totalPlans,
    }
}
