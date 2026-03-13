import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/corporate/company-agents
 * Returns the active agents for the current company.
 * Used by the invite-user modal to show which agents can be assigned.
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Resolve admin's company
        const { data: admins } = await supabase
            .from('admin_profiles')
            .select('company_id, role, scope')
            .eq('auth_user_id', user.id)

        if (!admins || admins.length === 0) {
            return NextResponse.json({ error: 'No admin access' }, { status: 403 })
        }

        const isSuperAdmin = admins.some((a: any) => a.scope === 'global' || a.role === 'super_admin')

        let companyId: string | null = null
        if (isSuperAdmin) {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            companyId = cookieStore.get('corporate_company_id')?.value || null
        }
        if (!companyId) {
            const instanceAdmin = admins.find((a: any) => a.company_id)
            companyId = instanceAdmin?.company_id || null
        }
        if (!companyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        // Fetch active agents from instance_features
        const { data: features } = await supabase
            .from('instance_features')
            .select('feature_key, enabled')
            .eq('client_company_id', companyId)
            .like('feature_key', 'agent:%')
            .eq('enabled', true)

        // Map to agent types and fetch names from company_prompts
        const agentTypes = (features || []).map(f => f.feature_key.replace('agent:', ''))

        let agents: { agent_type: string; agent_name: string }[] = []

        if (agentTypes.length > 0) {
            const { data: prompts } = await supabase
                .from('company_prompts')
                .select('agent_type, agent_name')
                .eq('company_id', companyId)
                .in('agent_type', agentTypes)
                .eq('active', true)

            agents = (prompts || []).map(p => ({
                agent_type: p.agent_type,
                agent_name: p.agent_name || `Agente ${p.agent_type}`,
            }))

            // Include any enabled features that don't have a prompt yet
            for (const at of agentTypes) {
                if (!agents.find(a => a.agent_type === at)) {
                    agents.push({
                        agent_type: at,
                        agent_name: `Agente ${at.charAt(0).toUpperCase() + at.slice(1)}`,
                    })
                }
            }
        }

        return NextResponse.json({ agents })
    } catch (error: any) {
        console.error('Error in GET /api/corporate/company-agents:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
