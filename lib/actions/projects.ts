'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

/**
 * Creates a new project for a company.
 * A project is technically a row in the 'companies' table with company_kind = 'project'
 * and linked to the main company via client_company_id.
 */
export async function createProject(companyId: string, name: string, description?: string) {
    const supabase = await createClient()
    const adminDb = createServiceClient() // Use service client to bypass RLS for initial creation if needed

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        throw new Error('Unauthorized: Please log in')
    }

    // 1. Create the project entry in 'companies' table
    const { data: project, error: projectError } = await adminDb
        .from('companies')
        .insert({
            name,
            company_kind: 'project',
            client_company_id: companyId,
            // Note: If description column doesn't exist, this might fail or be ignored.
            // Based on schema view, we don't have it, but we'll try to use frontend_config or notes if available.
        })
        .select()
        .single()

    if (projectError) {
        console.error('Error creating project:', projectError)
        throw new Error('Failed to create project')
    }

    // 2. Add the creator as the 'owner' of this project in project_members
    const { error: memberError } = await adminDb
        .from('project_members')
        .insert({
            project_id: project.id,
            user_id: user.id,
            role: 'owner'
        })

    if (memberError) {
        console.error('Error adding project owner:', memberError)
        // We don't throw here as the project was created, but membership is critical for access.
    }

    revalidatePath(`/${companyId}/projects`)
    revalidatePath(`/projects`)

    return project
}

export async function deleteGoal(goalId: string, projectId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)

    if (error) {
        console.error('Error deleting goal:', error)
        throw new Error('Failed to delete goal')
    }

    revalidatePath('/', 'layout')
}

export async function getProject(projectId: string) {
    const supabase = await createClient()

    const { data: project, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', projectId)
        .eq('company_kind', 'project')
        .single()

    if (error) {
        console.error('Error fetching project:', error)
        return null
    }

    return project
}

export async function getProjectGoals(projectId: string) {
    const supabase = await createClient()

    const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('context_company_id', projectId)
        .order('deadline', { ascending: true, nullsFirst: false })

    if (error) {
        console.error('Error fetching project goals:', error)
        return []
    }

    return goals
}

export async function upsertGoal(goal: any) {
    const supabase = await createClient()
    const adminDb = createServiceClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error('Unauthorized: Please log in')
    }

    const { id, projectId, title, description, priority, deadline } = goal

    // 1. Fetch Project to get client_company_id
    const { data: projectData, error: projectError } = await adminDb
        .from('companies')
        .select('client_company_id')
        .eq('id', projectId)
        .single()

    if (projectError || !projectData) {
        console.error('Error fetching project context:', projectError)
        throw new Error('Project context not found')
    }

    const clientCompanyId = projectData.client_company_id

    // 2. Resolve Contact ID
    const { data: contactResult, error: contactError } = await adminDb.rpc('resolve_contact_id', {
        p_user_id: user.id,
        p_company_id: clientCompanyId
    })

    let contactId: string | null = contactResult as string | null

    if (contactError || !contactId) {
        console.warn('Could not resolve contact_id via RPC, attempting fallback.')

        // Fallback: check if user_context has it
        const { data: uc } = await adminDb
            .from('user_context')
            .select('contact_id')
            .eq('contact_id', user.id)
            .maybeSingle()

        if (uc) contactId = uc.contact_id
        else contactId = user.id // Final fallback
    }

    const goalData: any = {
        title,
        description,
        priority,
        deadline,
        context_company_id: projectId,
        scope: 'company',
        contact_id: contactId
    }

    if (id) {
        const { error: updateError } = await adminDb
            .from('goals')
            .update(goalData)
            .eq('id', id)

        if (updateError) {
            console.error('Error updating goal:', updateError)
            throw new Error('Failed to update goal')
        }
    } else {
        const { error: insertError } = await adminDb
            .from('goals')
            .insert(goalData)

        if (insertError) {
            console.error('Error creating goal:', insertError)
            throw new Error('Failed to create goal')
        }
    }

    revalidatePath('/', 'layout')
}
