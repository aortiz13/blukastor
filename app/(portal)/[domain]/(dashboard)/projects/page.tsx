import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/lib/actions/project-sharing'
import { getCompanyByDomain } from '@/lib/data/companies'
import { redirect } from 'next/navigation'
import { ProjectListClient } from './_components/ProjectListClient'

export default async function ProjectsPage({
    params,
}: {
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const company = await getCompanyByDomain(supabase, domain)
    if (!company) return <div>Empresa no encontrada</div>

    const projects = await getUserProjects()

    return (
        <ProjectListClient
            projects={projects}
            companyId={company.id}
            domain={domain}
        />
    )
}
