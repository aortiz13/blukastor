import { createClient } from '@/lib/supabase/server'
import { TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Download, Calendar } from 'lucide-react'
import { OpenAICostCharts } from './_components/OpenAICostCharts'
import { CompanyAICosts } from './_components/CompanyAICosts'

export default async function FinancePage() {
    const supabase = await createClient()

    // Fetch global financial transactions
    const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(100)

    if (error) {
        return <div className="p-8 text-red-500">Error loading financial data: {error.message}</div>
    }

    // Mock Data for display purposes (as requested)
    // const income = transactions?.filter(t => t.transaction_type === 'income' || t.transaction_type === 'deposit').reduce((acc, t) => acc + (t.amount || 0), 0) || 0
    // const costs = transactions?.filter(t => t.transaction_type === 'expense' || t.transaction_type === 'withdrawal').reduce((acc, t) => acc + (t.amount || 0), 0) || 0

    const income = 128450.00
    const costs = 43501.00
    const netProfit = income - costs

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Finanzas Globales</h1>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wide">
                            Modo Demo
                        </span>
                    </div>
                    <p className="text-gray-500 mt-1">Consolidado de ingresos, egresos y rentabilidad de toda la red.</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white text-gray-700 px-4 py-3 rounded-xl font-bold border border-gray-100 shadow-sm flex items-center gap-2 hover:bg-gray-50 transition">
                        <Download size={18} />
                        <span>Exportar Informe</span>
                    </button>
                    <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5">
                        <Calendar size={18} />
                        <span>Este Mes</span>
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 rounded-2xl bg-green-50 text-green-600 group-hover:scale-110 transition-transform">
                            <TrendingUp size={28} />
                        </div>
                        <div className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight size={14} />
                            <span>15.2%</span>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ingresos Totales</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">${income.toLocaleString()}</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 rounded-2xl bg-red-50 text-red-600 group-hover:scale-110 transition-transform">
                            <TrendingDown size={28} />
                        </div>
                        <div className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full">
                            <ArrowDownRight size={14} />
                            <span>8.4%</span>
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Costos Operativos</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">${costs.toLocaleString()}</p>
                </div>

                <div className="bg-black p-8 rounded-3xl shadow-xl shadow-black/10 group overflow-hidden relative">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 rounded-2xl bg-white/10 text-white group-hover:scale-110 transition-transform">
                                <DollarSign size={28} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Net Profit</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Rentabilidad Neta</p>
                        <p className="text-4xl font-black text-white mt-2">${netProfit.toLocaleString()}</p>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                </div>
            </div>

            {/* ============================================================ */}
            {/* Per-Company AI Cost Breakdown                                */}
            {/* ============================================================ */}
            <CompanyAICosts />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Global OpenAI Costs */}
                <div className="lg:col-span-2">
                    <OpenAICostCharts />
                </div>

                {/* Categories Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-fit">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <PieChart size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Distribución de Gastos</h3>
                            <p className="text-xs text-gray-500">Desglose por categoría operativa</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {[
                            { name: 'Infraestructura (Cloud)', value: 45, color: 'bg-blue-500' },
                            { name: 'API Gemini/OpenAI', value: 30, color: 'bg-purple-500' },
                            { name: 'Sueldos y Operación', value: 20, color: 'bg-indigo-500' },
                            { name: 'Marketing', value: 5, color: 'bg-orange-500' },
                        ].map((item) => (
                            <div key={item.name} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-gray-500">{item.name}</span>
                                    <span className="text-gray-900">{item.value}%</span>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all duration-1000", item.color)} style={{ width: `${item.value}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-purple-50 rounded-2xl border border-purple-100 flex gap-3">
                        <div className="mt-1">
                            <TrendingDown size={16} className="text-purple-600" />
                        </div>
                        <p className="text-[11px] font-medium text-purple-700 leading-relaxed">
                            <span className="font-bold block mb-1 uppercase tracking-wider text-[10px]">Optimización Detectada</span>
                            El uso de modelos Flash (Gemini 2.0) ha reducido los costos de API en un <span className="font-bold">35%</span> este mes comparado con GPT-4o.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
