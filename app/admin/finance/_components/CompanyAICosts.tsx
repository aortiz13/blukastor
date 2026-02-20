'use client'

import { useEffect, useState, useCallback } from 'react'
import { Building2, Activity, Zap, DollarSign, Clock, ChevronDown } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, AreaChart, Area
} from 'recharts'
import { cn } from '@/lib/utils'

interface CompanySummary {
    company_id: string
    company_name: string
    total_invocations: number
    success_rate: number
    total_input_tokens: number
    total_output_tokens: number
    total_tokens: number
    estimated_cost_usd: number
    avg_latency_ms: number
    models: Record<string, number>
    agents: Record<string, number>
}

interface ApiResponse {
    summary: CompanySummary[]
    dailySeries: Record<string, any>[]
    companies: { id: string; name: string }[]
    period: { days: number; startDate: string }
}

const COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7'
]

const PERIODS = [
    { label: '7d', value: 7 },
    { label: '14d', value: 14 },
    { label: '30d', value: 30 },
    { label: '60d', value: 60 },
]

function formatCost(val: number): string {
    if (val >= 1) return `$${val.toFixed(2)}`
    if (val >= 0.01) return `$${val.toFixed(3)}`
    return `$${val.toFixed(4)}`
}

function formatTokens(val: number): string {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`
    return val.toString()
}

export function CompanyAICosts() {
    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [days, setDays] = useState(30)
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
    const [showDropdown, setShowDropdown] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({ days: days.toString() })
            if (selectedCompany) params.set('company_id', selectedCompany)
            const res = await fetch(`/api/admin/ai-costs-by-company?${params}`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json = await res.json()
            if (json.error) throw new Error(json.error)
            setData(json)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [days, selectedCompany])

    useEffect(() => { fetchData() }, [fetchData])

    // ── Totals ──
    const totalInvocations = data?.summary.reduce((s, c) => s + c.total_invocations, 0) || 0
    const totalCost = data?.summary.reduce((s, c) => s + c.estimated_cost_usd, 0) || 0
    const totalTokens = data?.summary.reduce((s, c) => s + c.total_tokens, 0) || 0
    const avgLatency = data?.summary.length
        ? Math.round(data.summary.reduce((s, c) => s + c.avg_latency_ms, 0) / data.summary.length)
        : 0

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-sm text-red-600 font-medium">Error cargando costos IA por empresa: {error}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Building2 size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Costos IA por Empresa</h2>
                        <p className="text-xs text-gray-400">Desglose de uso y costo estimado por cliente</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Company Filter */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                        >
                            {selectedCompany
                                ? data?.companies.find(c => c.id === selectedCompany)?.name || 'Empresa'
                                : 'Todas las empresas'}
                            <ChevronDown size={14} />
                        </button>
                        {showDropdown && (
                            <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                                <button
                                    onClick={() => { setSelectedCompany(null); setShowDropdown(false) }}
                                    className={cn(
                                        "w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors",
                                        !selectedCompany && "bg-indigo-50 text-indigo-700"
                                    )}
                                >
                                    Todas las empresas
                                </button>
                                {data?.companies.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => { setSelectedCompany(c.id); setShowDropdown(false) }}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-gray-50 transition-colors border-t border-gray-50",
                                            selectedCompany === c.id && "bg-indigo-50 text-indigo-700"
                                        )}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Period Selector */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {PERIODS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setDays(p.value)}
                                className={cn(
                                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                    days === p.value
                                        ? "bg-white text-indigo-700 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Invocaciones', value: totalInvocations.toLocaleString(), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Costo Estimado', value: formatCost(totalCost), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Tokens Totales', value: formatTokens(totalTokens), icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Latencia Prom.', value: `${avgLatency}ms`, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", card.bg)}>
                                <card.icon size={14} className={card.color} />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-gray-900">{loading ? '...' : card.value}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Company Table */}
            {!loading && data?.summary && data.summary.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-50">
                        <h3 className="text-sm font-bold text-gray-900">Desglose por Empresa</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Invocaciones</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Tokens</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Costo Est.</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Éxito</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Latencia</th>
                                    <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modelos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.summary.map((company, i) => (
                                    <tr key={company.company_id} className="hover:bg-gray-50/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                                />
                                                <span className="text-sm font-bold text-gray-900">{company.company_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm font-mono font-medium text-gray-700 text-right">
                                            {company.total_invocations.toLocaleString()}
                                        </td>
                                        <td className="px-5 py-4 text-sm font-mono font-medium text-gray-700 text-right">
                                            {formatTokens(company.total_tokens)}
                                        </td>
                                        <td className="px-5 py-4 text-sm font-mono font-bold text-green-600 text-right">
                                            {formatCost(company.estimated_cost_usd)}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                company.success_rate >= 90 ? "bg-green-50 text-green-600" :
                                                    company.success_rate >= 70 ? "bg-amber-50 text-amber-600" :
                                                        "bg-red-50 text-red-600"
                                            )}>
                                                {company.success_rate}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-mono text-gray-500 text-right">
                                            {company.avg_latency_ms > 0 ? `${company.avg_latency_ms}ms` : '—'}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(company.models).slice(0, 3).map(([model, count]) => (
                                                    <span key={model} className="text-[9px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">
                                                        {model} ({count})
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Cost bar visualization */}
                    {data.summary.length > 1 && (
                        <div className="p-5 border-t border-gray-50 space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Proporción de Costo</p>
                            <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                                {data.summary.map((company, i) => {
                                    const pct = totalCost > 0 ? (company.estimated_cost_usd / totalCost) * 100 : 0
                                    if (pct < 0.5) return null
                                    return (
                                        <div
                                            key={company.company_id}
                                            className="h-full transition-all duration-500"
                                            style={{
                                                width: `${pct}%`,
                                                backgroundColor: COLORS[i % COLORS.length],
                                            }}
                                            title={`${company.company_name}: ${pct.toFixed(1)}%`}
                                        />
                                    )
                                })}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {data.summary.map((company, i) => (
                                    <div key={company.company_id} className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-[10px] font-medium text-gray-500">{company.company_name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Daily Invocations Chart */}
            {!loading && data?.dailySeries && data.dailySeries.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Invocaciones Diarias por Empresa</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={data.dailySeries}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickFormatter={(d: string) => d.slice(5)}
                            />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            {data.companies.map((c, i) => (
                                <Area
                                    key={c.id}
                                    type="monotone"
                                    dataKey={c.name}
                                    stackId="1"
                                    stroke={COLORS[i % COLORS.length]}
                                    fill={COLORS[i % COLORS.length]}
                                    fillOpacity={0.4}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* No data state */}
            {!loading && (!data?.summary || data.summary.length === 0) && (
                <div className="p-8 bg-gray-50 rounded-2xl text-center">
                    <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-400">No hay datos de invocaciones IA en este período</p>
                    <p className="text-xs text-gray-300 mt-1">Las invocaciones de los agentes aparecerán aquí automáticamente</p>
                </div>
            )}
        </div>
    )
}
