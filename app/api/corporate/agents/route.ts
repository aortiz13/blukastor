import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/corporate/agents
 * Returns agents for the corporate admin's active company.
 * Only exposes safe fields (no system_message / full prompt).
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Determine company from admin_profiles
        const companyId = await resolveCompanyId(supabase, user.id, request)
        if (!companyId) {
            return NextResponse.json({ error: 'No corporate access' }, { status: 403 })
        }

        const { data: agents, error } = await supabase
            .from('company_prompts')
            .select('id, agent_type, agent_name, personality_traits, target_audience, active')
            .eq('company_id', companyId)
            .eq('active', true)
            .order('agent_type')

        if (error) {
            console.error('Error fetching agents:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ agents: agents || [] })
    } catch (error: any) {
        console.error('Error in GET /api/corporate/agents:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * PATCH /api/corporate/agents
 * Updates ONLY the 3 permitted fields for a specific agent.
 */
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check edit permission (not viewer)
        const companyId = await resolveCompanyId(supabase, user.id, request)
        if (!companyId) {
            return NextResponse.json({ error: 'No corporate access' }, { status: 403 })
        }

        const canEdit = await checkEditPermission(supabase, user.id, companyId)
        if (!canEdit) {
            return NextResponse.json({ error: 'Permisos insuficientes. Solo lectura.' }, { status: 403 })
        }

        const body = await request.json()
        const { agent_id, agent_name, personality_traits, target_audience } = body

        if (!agent_id) {
            return NextResponse.json({ error: 'agent_id es requerido' }, { status: 400 })
        }

        // Validate the agent belongs to this company
        const { data: existingAgent } = await supabase
            .from('company_prompts')
            .select('id, company_id')
            .eq('id', agent_id)
            .eq('company_id', companyId)
            .single()

        if (!existingAgent) {
            return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 })
        }

        // Build update object with only allowed fields
        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }

        if (agent_name !== undefined) {
            updateData.agent_name = agent_name?.trim() || 'Nova'  // Fallback to default
        }
        if (personality_traits !== undefined) {
            updateData.personality_traits = personality_traits
        }
        if (target_audience !== undefined) {
            updateData.target_audience = target_audience?.trim() || 'general'  // Fallback to default
        }

        const { data, error } = await supabase
            .from('company_prompts')
            .update(updateData)
            .eq('id', agent_id)
            .select('id, agent_type, agent_name, personality_traits, target_audience')
            .single()

        if (error) {
            console.error('Error updating agent:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            agent: data,
            message: 'Agente actualizado exitosamente',
        })
    } catch (error: any) {
        console.error('Error in PATCH /api/corporate/agents:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

// ─── Helpers ───────────────────────────────────────────────

async function resolveCompanyId(supabase: any, userId: string, request: Request): Promise<string | null> {
    const { data: admins } = await supabase
        .from('admin_profiles')
        .select('company_id, role, scope')
        .eq('auth_user_id', userId)

    if (!admins || admins.length === 0) return null

    // For super admins, check the company_id query param or cookie
    const isSuperAdmin = admins.some((a: any) => a.scope === 'global' || a.role === 'super_admin')

    if (isSuperAdmin) {
        const url = new URL(request.url)
        const companyParam = url.searchParams.get('company_id')
        if (companyParam) return companyParam
    }

    // Use the instance admin's company
    const instanceAdmin = admins.find((a: any) => a.scope === 'instance') || admins[0]
    return instanceAdmin.company_id
}

async function checkEditPermission(supabase: any, userId: string, companyId: string): Promise<boolean> {
    const { data: admin } = await supabase
        .from('admin_profiles')
        .select('role, scope')
        .eq('auth_user_id', userId)
        .single()

    if (!admin) return false

    // Super admins can always edit
    if (admin.scope === 'global' || admin.role === 'super_admin') return true

    // Instance admins can edit unless they are viewers
    return admin.role !== 'viewer'
}
