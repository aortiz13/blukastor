import { getCompanyByDomain } from '@/lib/data/companies'
import { createClient } from '@/lib/supabase/server'
import { getFinancialStats, getTransactions, getProjects, getUniqueCategories, getDashboardChartsData } from '@/lib/actions/finance'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TransactionForm } from './_components/TransactionForm'
import { TransactionTable } from './_components/TransactionTable'
import { ProjectFilter } from './_components/ProjectFilter'
import { ReceiptUpload } from './_components/ReceiptUpload'
import { ExcelBulkUpload } from './_components/ExcelBulkUpload'
import { CashFlowChart } from './_components/charts/CashFlowChart'
import { ExpensePieChart } from './_components/charts/ExpensePieChart'
import { NetWorthChart } from './_components/charts/NetWorthChart'
import { ProjectIncomeChart } from './_components/charts/ProjectIncomeChart'
import { FinancePageClient, TransactionsCardHeader } from './_components/FinancePageClient'

export default async function FinancePage({
    params,
    searchParams,
}: {
    params: Promise<{ domain: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { domain: rawDomain } = await params
    const resolvedSearchParams = await searchParams
    const projectId = typeof resolvedSearchParams?.projectId === 'string' ? resolvedSearchParams.projectId : undefined

    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    console.log('[FinancePage] Domain:', domain)
    const company = await getCompanyByDomain(supabase, domain)
    console.log('[FinancePage] Resolved Company:', company?.id, company?.name)

    if (!company) return <div>Company not found</div>

    // Prepare search params for transactions
    const transactionParams = {
        limit: 100,
        projectId,
        startDate: resolvedSearchParams?.startDate as string,
        endDate: resolvedSearchParams?.endDate as string,
        type: resolvedSearchParams?.type as 'all' | 'income' | 'expense',
        category: resolvedSearchParams?.category as string,
        sort: resolvedSearchParams?.sort as 'date' | 'amount',
        order: resolvedSearchParams?.order as 'asc' | 'desc',
    }

    // Parallel data fetching
    const [stats, transactions, projects, categories, chartData, contactResult] = await Promise.all([
        getFinancialStats(company.id, projectId),
        getTransactions(company.id, transactionParams),
        getProjects(company.id),
        getUniqueCategories(company.id),
        getDashboardChartsData(company.id, projectId),
        supabase.schema('wa').from('contacts').select('id').eq('user_id', user?.id).single()
    ])

    const contact = contactResult.data
    const userId = contact?.id || user?.id
    const companyCurrency = company.currency || 'USD'

    return (
        <FinancePageClient
            companyCurrency={companyCurrency}
            stats={stats}
            projectId={projectId}
            toolbar={
                <>
                    <ProjectFilter projects={projects || []} />
                    <ExcelBulkUpload companyId={company.id} userId={userId} companyCurrency={companyCurrency} />
                    <ReceiptUpload companyId={company.id} userId={userId} companyCurrency={companyCurrency} />
                    <TransactionForm companyId={company.id} userId={userId} companyCurrency={companyCurrency} />
                </>
            }
        >
            {/* Charts Section 1: Cash Flow & Expenses */}
            <div className="grid gap-4 md:grid-cols-7">
                {chartData && <CashFlowChart data={chartData.cashFlowData} currency={companyCurrency} />}
                {chartData && <ExpensePieChart data={chartData.categoryData} currency={companyCurrency} />}
            </div>

            {/* Charts Section 2: Net Worth & Project Income */}
            <div className="grid gap-4 md:grid-cols-7">
                {chartData && <NetWorthChart data={chartData.netWorthData} currency={companyCurrency} />}
                {chartData && <ProjectIncomeChart data={chartData.projectData} currency={companyCurrency} />}
            </div>

            {/* Recent Transactions Table */}
            <Card>
                <CardHeader>
                    <TransactionsCardHeader />
                </CardHeader>
                <CardContent>
                    <TransactionTable
                        transactions={transactions}
                        companyCurrency={companyCurrency}
                        categories={categories || []}
                    />
                </CardContent>
            </Card>
        </FinancePageClient>
    )
}
