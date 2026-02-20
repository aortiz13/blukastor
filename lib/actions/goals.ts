'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

// ============================================================================
// Company-scoped goal actions for the Goals & OKRs page
// Schema: goals(id, scope, contact_id, context_company_id, user_company_id,
//         title, description, target, deadline, krs, status, priority,
//         created_at, updated_at)
// ============================================================================

export async function getCompanyGoals(companyId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('context_company_id', companyId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching goals:', error)
        return []
    }

    return data
}

export async function createGoal(data: {
    companyId: string
    title: string
    description?: string
    target?: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    scope: 'personal' | 'company'
    deadline?: string
    krs?: string[]
    userCompanyId?: string
}) {
    const supabase = await createClient()
    const adminDb = createServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('No autorizado')

    // Resolve contact_id
    let contactId: string = user.id
    const { data: contactResult } = await adminDb.rpc('resolve_contact_id', {
        p_user_id: user.id,
        p_company_id: data.companyId,
    })
    if (contactResult) contactId = contactResult as string

    const { error } = await adminDb.from('goals').insert({
        title: data.title,
        description: data.description || null,
        target: data.target || null,
        priority: data.priority,
        scope: data.scope,
        deadline: data.deadline || null,
        krs: data.krs && data.krs.length > 0 ? data.krs : null,
        context_company_id: data.companyId,
        user_company_id: data.scope === 'company' ? (data.userCompanyId || data.companyId) : null,
        contact_id: contactId,
        status: 'active',
    })

    if (error) {
        console.error('Error creating goal:', error)
        throw new Error('Error al crear objetivo')
    }

    revalidatePath('/', 'layout')
}

export async function updateGoal(goalId: string, data: {
    title?: string
    description?: string | null
    target?: string | null
    priority?: 'low' | 'medium' | 'high' | 'critical'
    scope?: 'personal' | 'company'
    deadline?: string | null
    krs?: string[] | null
    status?: string
}) {
    const supabase = await createClient()
    const adminDb = createServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('No autorizado')

    const payload: Record<string, any> = { updated_at: new Date().toISOString() }
    if (data.title !== undefined) payload.title = data.title
    if (data.description !== undefined) payload.description = data.description
    if (data.target !== undefined) payload.target = data.target
    if (data.priority !== undefined) payload.priority = data.priority
    if (data.scope !== undefined) payload.scope = data.scope
    if (data.deadline !== undefined) payload.deadline = data.deadline
    if (data.krs !== undefined) payload.krs = data.krs
    if (data.status !== undefined) payload.status = data.status

    const { error } = await adminDb
        .from('goals')
        .update(payload)
        .eq('id', goalId)

    if (error) {
        console.error('Error updating goal:', error)
        throw new Error('Error al actualizar objetivo')
    }

    revalidatePath('/', 'layout')
}

export async function removeGoal(goalId: string) {
    const supabase = await createClient()
    const adminDb = createServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('No autorizado')

    const { error } = await adminDb
        .from('goals')
        .delete()
        .eq('id', goalId)

    if (error) {
        console.error('Error deleting goal:', error)
        throw new Error('Error al eliminar objetivo')
    }

    revalidatePath('/', 'layout')
}
