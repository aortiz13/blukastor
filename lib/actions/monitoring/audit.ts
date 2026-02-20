'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuditFilters } from '@/lib/types/monitoring'

/**
 * Get user audit trail with optional filters
 */
export async function getUserAuditTrail(filters: AuditFilters = {}) {
    const supabase = await createClient()

    let query = supabase
        .from('user_audit_trail')
        .select('*')
        .order('timestamp', { ascending: false })

    if (filters.action) {
        query = query.eq('action', filters.action)
    }

    if (filters.tableName) {
        query = query.eq('table_name', filters.tableName)
    }

    if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
    }

    if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate)
    }

    if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate)
    }

    const { data, error } = await query.limit(100)

    if (error) {
        console.error('Error fetching audit trail:', error)
        throw new Error('Failed to fetch audit trail')
    }

    return data
}
