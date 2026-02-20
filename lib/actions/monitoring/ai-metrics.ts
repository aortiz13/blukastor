'use server'

import { createClient } from '@/lib/supabase/server'
import type { DateRange } from '@/lib/types/monitoring'

/**
 * Get AI agent performance metrics
 */
export async function getAIAgentMetrics(dateRange?: DateRange) {
    const supabase = await createClient()

    let query = supabase
        .from('llm_invocations')
        .select('*')
        .order('started_at', { ascending: false })

    if (dateRange?.startDate) {
        query = query.gte('started_at', dateRange.startDate)
    }

    if (dateRange?.endDate) {
        query = query.lte('started_at', dateRange.endDate)
    }

    const { data, error } = await query.limit(1000)

    if (error) {
        console.error('Error fetching AI metrics:', error)
        throw new Error('Failed to fetch AI metrics')
    }

    // Calculate aggregated metrics
    const metrics = {
        totalInvocations: data.length,
        successRate: (data.filter(d => d.success).length / data.length) * 100,
        averageLatency: data.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / data.length,
        byAgentType: {} as Record<string, {
            count: number
            avgLatency: number
            successRate: number
        }>
    }

    // Group by agent type
    data.forEach(invocation => {
        const agentType = invocation.agent_type || 'unknown'
        if (!metrics.byAgentType[agentType]) {
            metrics.byAgentType[agentType] = {
                count: 0,
                avgLatency: 0,
                successRate: 0
            }
        }
        metrics.byAgentType[agentType].count++
    })

    // Calculate averages per agent type
    Object.keys(metrics.byAgentType).forEach(agentType => {
        const agentData = data.filter(d => d.agent_type === agentType)
        metrics.byAgentType[agentType].avgLatency =
            agentData.reduce((sum, d) => sum + (d.latency_ms || 0), 0) / agentData.length
        metrics.byAgentType[agentType].successRate =
            (agentData.filter(d => d.success).length / agentData.length) * 100
    })

    return metrics
}

/**
 * Get agent performance by specific agent type
 */
export async function getAgentPerformanceByType(agentType: string, dateRange?: DateRange) {
    const supabase = await createClient()

    let query = supabase
        .from('llm_invocations')
        .select('*')
        .eq('agent_type', agentType)
        .order('started_at', { ascending: false })

    if (dateRange?.startDate) {
        query = query.gte('started_at', dateRange.startDate)
    }

    if (dateRange?.endDate) {
        query = query.lte('started_at', dateRange.endDate)
    }

    const { data, error } = await query.limit(500)

    if (error) {
        console.error('Error fetching agent performance:', error)
        throw new Error('Failed to fetch agent performance')
    }

    return data
}
