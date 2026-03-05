import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, BarChart3, PieChart } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function CorporateFinancePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Get all companies (projects) under this client_company
    const { data: companies } = await supabase
        .from('companies')
        .select('id, name')
        .eq('client_company_id', activeCompany.companyId)

    const companyIds = companies?.map(c => c.id) || []

    // Fetch financial transactions for all companies under this client
    let transactions: any[] = []
    if (companyIds.length > 0) {
        const { data } = await supabase
            .from('financial_transactions')
            .select('*')
            .in('context_company_id', companyIds)
            .order('date', { ascending: false })
        transactions = data || []
    }

    // Fetch budgets
    let budgets: any[] = []
    if (companyIds.length > 0) {
        const { data } = await supabase
            .from('financial_budgets')
            .select('*')
            .in('company_id', companyIds)
        budgets = data || []
    }

    // Calculate totals
    const totalIncome = transactions
        .filter(t => t.transaction_type === 'income' && t.status !== 'cancelled')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    const totalExpenses = transactions
        .filter(t => t.transaction_type === 'expense' && t.status !== 'cancelled')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0)

    const netBalance = totalIncome - totalExpenses

    // Category breakdown
    const categoryMap: Record<string, { income: number; expense: number }> = {}
    transactions.forEach(t => {
        const cat = t.category || 'Sin categoría'
        if (!categoryMap[cat]) categoryMap[cat] = { income: 0, expense: 0 }
        const amount = parseFloat(t.amount)
        if (t.transaction_type === 'income') categoryMap[cat].income += amount
        else categoryMap[cat].expense += amount
    })

    const categories = Object.entries(categoryMap)
        .map(([name, data]) => ({ name, ...data, net: data.income - data.expense }))
        .sort((a, b) => (b.income + b.expense) - (a.income + a.expense))

    // Monthly breakdown (last 6 months)
    const now = new Date()
    const monthlyData: { month: string; income: number; expense: number }[] = []
    for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
        const monthName = monthDate.toLocaleDateString('es', { month: 'short', year: '2-digit' })

        const monthTransactions = transactions.filter(t => t.date.startsWith(monthKey) && t.status !== 'cancelled')
        const income = monthTransactions.filter(t => t.transaction_type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0)
        const expense = monthTransactions.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0)

        monthlyData.push({ month: monthName, income, expense })
    }

    const maxMonthly = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Finanzas Globales</h1>
                <p className="text-gray-500 mt-1">
                    Visión financiera de <span className="font-semibold text-gray-700">{activeCompany.companyName}</span>
                    {companies && companies.length > 0 && (
                        <span className="text-gray-400"> · {companies.length} proyectos</span>
                    )}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                            <TrendingUp size={22} />
                        </div>
                        <ArrowUpRight size={18} className="text-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingresos Totales</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">${totalIncome.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white">
                            <TrendingDown size={22} />
                        </div>
                        <ArrowDownRight size={18} className="text-red-400" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gastos Totales</p>
                    <p className="text-3xl font-black text-gray-900 mt-1">${totalExpenses.toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <div className={cn(
                            "p-3 rounded-2xl bg-gradient-to-br text-white",
                            netBalance >= 0 ? "from-blue-500 to-blue-600" : "from-orange-500 to-orange-600"
                        )}>
                            <DollarSign size={22} />
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Balance Neto</p>
                    <p className={cn(
                        "text-3xl font-black mt-1",
                        netBalance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                        {netBalance >= 0 ? '+' : '-'}${Math.abs(netBalance).toLocaleString('en', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Monthly Chart (Simple bar chart) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
                    <BarChart3 size={18} className="text-gray-400" />
                    Tendencia Mensual (últimos 6 meses)
                </h2>
                <div className="flex items-end justify-between gap-4 h-40">
                    {monthlyData.map((month) => (
                        <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex gap-1 items-end justify-center" style={{ height: '120px' }}>
                                <div
                                    className="w-5 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all"
                                    style={{ height: `${(month.income / maxMonthly) * 100}%`, minHeight: month.income > 0 ? '4px' : '0' }}
                                    title={`Ingresos: $${month.income.toLocaleString()}`}
                                />
                                <div
                                    className="w-5 bg-gradient-to-t from-red-500 to-red-400 rounded-t-md transition-all"
                                    style={{ height: `${(month.expense / maxMonthly) * 100}%`, minHeight: month.expense > 0 ? '4px' : '0' }}
                                    title={`Gastos: $${month.expense.toLocaleString()}`}
                                />
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium uppercase">{month.month}</span>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-6 mt-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Ingresos</span>
                    <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Gastos</span>
                </div>
            </div>

            {/* Two Columns: Categories + Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <PieChart size={18} className="text-gray-400" />
                            Por Categoría
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {categories.slice(0, 8).map((cat) => (
                            <div key={cat.name} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <p className="font-medium text-gray-900 text-sm">{cat.name}</p>
                                <div className="flex items-center gap-4">
                                    {cat.income > 0 && (
                                        <span className="text-xs text-emerald-600 font-bold">+${cat.income.toLocaleString()}</span>
                                    )}
                                    {cat.expense > 0 && (
                                        <span className="text-xs text-red-600 font-bold">-${cat.expense.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="px-6 py-8 text-center text-gray-400 text-sm">Sin datos de categorías</div>
                        )}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign size={18} className="text-gray-400" />
                            Transacciones Recientes
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {transactions.slice(0, 10).map((tx) => (
                            <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center",
                                        tx.transaction_type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                    )}>
                                        {tx.transaction_type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{tx.description || tx.category || 'Transacción'}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={cn(
                                    "font-bold text-sm",
                                    tx.transaction_type === 'income' ? "text-emerald-600" : "text-red-600"
                                )}>
                                    {tx.transaction_type === 'income' ? '+' : '-'}${parseFloat(tx.amount).toLocaleString()}
                                </span>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <div className="px-6 py-8 text-center text-gray-400 text-sm">Sin transacciones registradas</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
