'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get n8n workflow execution status from DB
 */
export async function getN8nWorkflowStatus(limit = 50) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('n8n_workflow_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching workflow status:', error)
        throw new Error('Failed to fetch workflow status')
    }

    return data
}

/**
 * Get execution history for a specific workflow
 */
export async function getWorkflowExecutionHistory(workflowId: string, limit = 20) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('n8n_workflow_status')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching workflow execution history:', error)
        throw new Error('Failed to fetch workflow execution history')
    }

    return data
}

/**
 * Get full workflow details (nodes, connections) from n8n API
 */
export async function getN8nWorkflowDetails(workflowId: string) {
    const n8nUrl = process.env.N8N_API_URL
    const n8nKey = process.env.N8N_API_KEY

    if (!n8nUrl || !n8nKey) {
        console.warn('N8N credentials not configured')
        return null
    }

    try {
        const response = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
            headers: {
                'X-N8N-API-KEY': n8nKey
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            console.error(`Failed to fetch workflow details: ${response.status} ${response.statusText}`)
            return null
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error('Error fetching n8n workflow details:', error)
        return null
    }
}

/**
 * Get all workflows from n8n API
 */
export async function getN8nWorkflows() {
    const n8nUrl = process.env.N8N_API_URL
    const n8nKey = process.env.N8N_API_KEY
    const TAG_ID = 'XmLOpjNMQk8o5AMf'

    if (!n8nUrl || !n8nKey) {
        return []
    }

    try {
        const response = await fetch(`${n8nUrl}/api/v1/workflows`, {
            headers: {
                'X-N8N-API-KEY': n8nKey
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            console.error(`Failed to fetch workflows: ${response.status} ${await response.text()}`)
            return []
        }

        const data = await response.json()
        let workflows = []

        if (Array.isArray(data)) {
            workflows = data
        } else if (data.data && Array.isArray(data.data)) {
            workflows = data.data
        }

        const filteredWorkflows = workflows.filter((w: any) => {
            if (!w.tags || !Array.isArray(w.tags)) return false
            return w.tags.some((t: any) => t.id === TAG_ID || t.name === 'Diana')
        })

        return filteredWorkflows

    } catch (error) {
        console.error('Error fetching n8n workflows:', error)
        return []
    }
}

/**
 * Get executions from n8n API
 */
export async function getN8nExecutions(workflowId?: string, limit = 20) {
    const n8nUrl = process.env.N8N_API_URL
    const n8nKey = process.env.N8N_API_KEY

    if (!n8nUrl || !n8nKey) {
        return []
    }

    try {
        const url = new URL(`${n8nUrl}/api/v1/executions`)
        url.searchParams.append('limit', limit.toString())
        if (workflowId) {
            url.searchParams.append('workflowId', workflowId)
        }

        const response = await fetch(url.toString(), {
            headers: {
                'X-N8N-API-KEY': n8nKey
            },
            next: { revalidate: 0 }
        })

        if (!response.ok) {
            console.error(`Failed to fetch executions: ${response.status}`)
            return []
        }

        const data = await response.json()
        const executions = data.data || []

        return executions.map((exec: any) => {
            const startedAt = new Date(exec.startedAt)
            const stoppedAt = exec.stoppedAt ? new Date(exec.stoppedAt) : new Date()
            const duration = stoppedAt.getTime() - startedAt.getTime()

            return {
                id: exec.id,
                workflow_id: exec.workflowId,
                workflow_name: exec.workflowName || 'Unknown Workflow',
                status: exec.status || (exec.finished ? 'success' : 'running'),
                started_at: exec.startedAt,
                finished_at: exec.stoppedAt,
                execution_time_ms: duration,
                created_at: exec.startedAt,
                metadata: { mode: exec.mode }
            }
        })

    } catch (error) {
        console.error('Error fetching n8n executions:', error)
        return []
    }
}
