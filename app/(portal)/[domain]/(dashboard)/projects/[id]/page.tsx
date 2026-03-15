import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getProject, getProjectGoals } from '@/lib/actions/projects'
import { getTransactions } from '@/lib/actions/finance'
import { getProjectMembers, getProjectInvites } from '@/lib/actions/project-sharing'
import { redirect } from 'next/navigation'
import { ProjectDetailClient } from '../_components/ProjectDetailClient'

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ domain: string, id: string }>
}) {
    const { domain, id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const project = await getProject(id)
    if (!project) return <div>Proyecto no encontrado</div>

    const companyId = project.client_company_id || project.id
    const companyCurrency = project.currency || 'USD'

    // Resolve contact for floating chat
    let chatContactId: string | null = null
    try {
        const adminDb = createServiceClient()
        const { data: resolvedContactId } = await adminDb.rpc('resolve_contact_id', {
            p_user_id: user.id,
            p_company_id: id,
        })
        chatContactId = resolvedContactId as string | null
    } catch (e) {
        console.error('Error resolving contact for floating chat:', e)
    }

    // Fetch company_context for the "Negocio" tab
    let companyContext: any = null
    if (project.company_kind === 'business') {
        try {
            const adminDb = createServiceClient()
            const { data } = await adminDb
                .from('company_context')
                .select('*')
                .eq('company_id', id)
                .single()
            companyContext = data
        } catch (e) {
            console.error('Error fetching company_context:', e)
        }
    }

    const [goals, transactions, teamMembers, teamInvites] = await Promise.all([
        getProjectGoals(id),
        getTransactions(companyId, { projectId: id, limit: 20 }),
        getProjectMembers(id),
        getProjectInvites(id),
    ])

    return (
        <ProjectDetailClient
            domain={domain}
            project={project}
            goals={goals}
            transactions={transactions}
            companyCurrency={companyCurrency}
            chatContactId={chatContactId}
            companyContext={companyContext}
            teamMembers={teamMembers || []}
            teamInvites={teamInvites || []}
        />
    )
}
