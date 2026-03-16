import { createClient } from '@/lib/supabase/server'
import { getCompanyByDomain } from '@/lib/data/companies'
import { TransactionsClient } from './_components/TransactionsClient'

export default async function TransactionsPage({
    params,
}: {
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    const company = await getCompanyByDomain(supabase, domain)
    const companyCurrency = company?.currency || 'USD'

    const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('context_company_id', company?.id)
        .order('date', { ascending: false })

    if (error) {
        return <div className="p-8 text-red-500">Error: {error.message}</div>
    }

    return (
        <TransactionsClient
            transactions={transactions || []}
            companyCurrency={companyCurrency}
        />
    )
}
