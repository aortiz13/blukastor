import { createClient } from '@/lib/supabase/server'
import { getMyTeams } from '@/lib/actions/project-sharing'
import { getCompanyByDomain } from '@/lib/data/companies'
import { redirect } from 'next/navigation'
import { MyTeamsClient } from './_components/MyTeamsClient'

export default async function MyTeamsPage({
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
    if (!company) return <div>Company not found</div>

    const teams = await getMyTeams()

    return <MyTeamsClient teams={teams} />
}
