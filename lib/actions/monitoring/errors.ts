'use server'

import { createClient } from '@/lib/supabase/server'
import type { ErrorFilters } from '@/lib/types/monitoring'

/**
 * Get system error logs with optional filters
 */
export async function getSystemErrors(filters: ErrorFilters = {}) {
    const supabase = await createClient()

    let query = supabase
        .from('system_error_logs')
        .select('*')
        .order('timestamp', { ascending: false })

    if (filters.severity) {
        query = query.eq('severity', filters.severity)
    }

    if (filters.origin) {
        query = query.eq('origin', filters.origin)
    }

    if (filters.resolved !== undefined) {
        query = query.eq('resolved', filters.resolved)
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
        console.error('Error fetching system errors:', error)
        throw new Error('Failed to fetch system errors')
    }

    return data
}

/**
 * Mark an error as resolved
 */
export async function resolveError(errorId: string, resolvedBy?: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('system_error_logs')
        .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: resolvedBy || null
        })
        .eq('id', errorId)
        .select()
        .single()

    if (error) {
        console.error('Error resolving error:', error)
        throw new Error('Failed to resolve error')
    }

    return data
}

/**
 * Get data quality issues
 */
export async function getDataQualityIssues() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('data_quality_issues')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(100)

    if (error) {
        console.error('Error fetching data quality issues:', error)
        throw new Error('Failed to fetch data quality issues')
    }

    return data
}
