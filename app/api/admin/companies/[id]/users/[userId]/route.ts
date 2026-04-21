import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string, userId: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: companyId, userId } = await params

        // Check if user is super admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminCheck } = await supabase
            .from('admin_profiles')
            .select('role, scope')
            .eq('auth_user_id', user.id)
            .single()

        if (!adminCheck || (adminCheck.scope !== 'global' && adminCheck.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Forbidden: Super admin privileges required' }, { status: 403 })
        }

        // Remove user from the company's admin_profiles
        const { error: adminError } = await supabase
            .from('admin_profiles')
            .delete()
            .eq('auth_user_id', userId)
            .eq('company_id', companyId)

        if (adminError) {
            console.error('Error removing admin profile from company:', adminError)
            return NextResponse.json({ error: adminError.message }, { status: 500 })
        }

        // Also remove from project_members for projects associated with this company
        // First get the company's projects
        const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select('id')
            .eq('client_company_id', companyId)

        if (!projectsError && projects && projects.length > 0) {
            const projectIds = projects.map(p => p.id)

            const { error: projectError } = await supabase
                .from('project_members')
                .delete()
                .eq('user_id', userId)
                .in('project_id', projectIds)

            if (projectError) {
                console.error('Error removing project memberships:', projectError)
                // Don't fail the request entirely
            }
        }

        return NextResponse.json({
            success: true,
            message: 'User removed from company successfully'
        })
    } catch (error: any) {
        console.error('Error in DELETE /api/admin/companies/[id]/users/[userId]:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
