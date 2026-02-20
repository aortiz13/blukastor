'use client'

import { useEffect, useState } from 'react'
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import { Loader2, AlertTriangle, Cpu, DollarSign, Zap, TrendingUp } from 'lucide-react'

interface CostsData {
    costs: {
        series: { date: string; total_cents: number; items: Record<string, number> }[]
        totalCostCents: number
        totalCostUsd: number
        lineItemTotals: Record<string, number>
    }
    usage: {
        series: { date: string; input_tokens: number; output_tokens: number; models: Record<string, { input: number; output: number }> }[]
        totalInputTokens: number
        totalOutputTokens: number
        totalTokens: number
        modelTotals: Record<string, { input: number; output: number }>
    }
    period: { days: number; startTime: number; endTime: number }
}

const CHART_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#f97316', '#eab308',
    '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

function formatUsd(cents: number) {
    return '$' + (cents / 100).toFixed(2)
}

function formatTokens(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
    return n.toString()
}

function shortDate(date: string) {
    const d = new Date(date + 'T00:00:00')
    return d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })
}

export function OpenAICostCharts() {
    const [data, setData] = useState<CostsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [days, setDays] = useState(30)

    useEffect(() => {
        setLoading(true)
        setError(null)
        fetch(`/api/admin/openai-costs?days=${days}`)
            .then(async (res) => {
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error || `HTTP ${res.status}`)
                }
                return res.json()
            })
            .then(setData)
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false))
    }, [days])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-gray-400" size={32} />
                <span className="ml-3 text-gray-500 font-medium">Cargando datos de OpenAI...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                    <p className="font-bold text-red-700 text-sm">Error al cargar costos de OpenAI</p>
                    <p className="text-red-600 text-xs mt-1">{error}</p>
                    <p className="text-red-500 text-[11px] mt-2">Verifica que <code className="bg-red-100 px-1 rounded">OPENAI_ADMIN_KEY</code> esté configurado en tu .env.local</p>
                </div>
            </div>
        )
    }

    if (!data) return null

    const { costs, usage } = data

    // Prepare daily cost chart data
    const dailyCostData = costs.series.map((d) => ({
        date: shortDate(d.date),
        cost: d.total_cents / 100,
    }))

    // Prepare line item pie data
    const lineItemPie = Object.entries(costs.lineItemTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name, cents], i) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: cents / 100,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }))

    // Prepare daily token usage data
    const dailyTokenData = usage.series.map((d) => ({
        date: shortDate(d.date),
        input: d.input_tokens,
        output: d.output_tokens,
    }))

    // Prepare model breakdown data
    const modelBreakdown = Object.entries(usage.modelTotals)
        .sort((a, b) => (b[1].input + b[1].output) - (a[1].input + a[1].output))
        .map(([model, tokens], i) => ({
            model,
            input: tokens.input,
            output: tokens.output,
            total: tokens.input + tokens.output,
            color: CHART_COLORS[i % CHART_COLORS.length],
        }))

    return (
        <div className="space-y-8">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl text-white shadow-lg shadow-green-600/20">
                        <Cpu size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">OpenAI — Costos y Uso</h2>
                        <p className="text-xs text-gray-500">Datos en tiempo real de la API de Organización</p>
                    </div>
                </div>
                <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
                    {[7, 14, 30, 60].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${days === d
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                    icon={<DollarSign size={20} />}
                    iconBg="bg-green-50 text-green-600"
                    label="Gasto Total"
                    value={`$${costs.totalCostUsd.toFixed(2)}`}
                    subtext={`últimos ${days} días`}
                />
                <SummaryCard
                    icon={<Zap size={20} />}
                    iconBg="bg-purple-50 text-purple-600"
                    label="Tokens Totales"
                    value={formatTokens(usage.totalTokens)}
                    subtext={`${formatTokens(usage.totalInputTokens)} in / ${formatTokens(usage.totalOutputTokens)} out`}
                />
                <SummaryCard
                    icon={<Cpu size={20} />}
                    iconBg="bg-blue-50 text-blue-600"
                    label="Modelos Usados"
                    value={Object.keys(usage.modelTotals).length.toString()}
                    subtext="modelos distintos"
                />
                <SummaryCard
                    icon={<TrendingUp size={20} />}
                    iconBg="bg-amber-50 text-amber-600"
                    label="Costo Promedio/Día"
                    value={costs.series.length > 0 ? `$${(costs.totalCostUsd / costs.series.length).toFixed(2)}` : '$0.00'}
                    subtext="promedio diario"
                />
            </div>

            {/* Charts Row 1: Daily Cost + Line Item Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Gasto Diario (USD)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyCostData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                    formatter={(val: any) => [`$${Number(val || 0).toFixed(4)}`, 'Costo']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cost"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fill="url(#colorCost)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Distribución por Tipo</h3>
                    {lineItemPie.length > 0 ? (
                        <>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={lineItemPie}
                                            dataKey="value"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={70}
                                            innerRadius={40}
                                            paddingAngle={2}
                                        >
                                            {lineItemPie.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                                            formatter={(val: any) => [`$${Number(val || 0).toFixed(4)}`, '']}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-2">
                                {lineItemPie.slice(0, 5).map((item) => (
                                    <div key={item.name} className="flex items-center gap-2 text-xs">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="text-gray-600 flex-1 truncate">{item.name}</span>
                                        <span className="font-mono font-bold text-gray-900">${item.value.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
                    )}
                </div>
            </div>

            {/* Charts Row 2: Token Usage + Model Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Uso de Tokens Diario</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyTokenData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={formatTokens} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                                    formatter={(val: any) => [formatTokens(Number(val || 0)), '']}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '11px' }}
                                    formatter={(value) => (value === 'input' ? 'Input Tokens' : 'Output Tokens')}
                                />
                                <Bar dataKey="input" stackId="tokens" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="output" stackId="tokens" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Uso por Modelo</h3>
                    {modelBreakdown.length > 0 ? (
                        <div className="space-y-4">
                            {modelBreakdown.map((m) => {
                                const maxTotal = modelBreakdown[0]?.total || 1
                                const pct = Math.round((m.total / maxTotal) * 100)
                                return (
                                    <div key={m.model} className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-bold text-gray-700 truncate max-w-[60%]">{m.model}</span>
                                            <span className="font-mono text-gray-500">{formatTokens(m.total)}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%`, backgroundColor: m.color }}
                                            />
                                        </div>
                                        <div className="flex gap-4 text-[10px] text-gray-400">
                                            <span>In: {formatTokens(m.input)}</span>
                                            <span>Out: {formatTokens(m.output)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 text-center py-10">Sin datos</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function SummaryCard({ icon, iconBg, label, value, subtext }: {
    icon: React.ReactNode
    iconBg: string
    label: string
    value: string
    subtext: string
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400 mt-1">{subtext}</p>
        </div>
    )
}
