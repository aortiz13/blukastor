import { createClient } from '@/lib/supabase/server'
import { getCompanyByDomain } from '@/lib/data/companies'
import { getCompanyGoals } from '@/lib/actions/goals'
import { GoalCard } from './_components/GoalCard'
import { GoalsPageClient } from './_components/GoalsPageClient'

export default async function GoalsPage({
    params,
}: {
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    const company = await getCompanyByDomain(supabase, domain)
    if (!company) {
        return <div className="p-8 text-red-500">Could not load company.</div>
    }

    const goals = await getCompanyGoals(company.id)

    const totalGoals = goals.length
    const completed = goals.filter((g: any) => g.status === 'completed').length
    const active = totalGoals - completed
    const totalKrs = goals.reduce((sum: number, g: any) => sum + (Array.isArray(g.krs) ? g.krs.length : 0), 0)

    return (
        <GoalsPageClient
            totalGoals={totalGoals}
            completed={completed}
            active={active}
            totalKrs={totalKrs}
            companyId={company.id}
            goals={goals}
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goals.map((goal: any) => (
                    <GoalCard key={goal.id} goal={goal} companyId={company.id} />
                ))}
            </div>
        </GoalsPageClient>
    )
}
