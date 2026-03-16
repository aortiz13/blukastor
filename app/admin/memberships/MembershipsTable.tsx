'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function Calendar({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    )
}

function RefreshCcw({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="1 4 1 10 7 10" />
            <polyline points="23 20 23 14 17 14" />
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
        </svg>
    )
}

function Package({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    )
}

function CheckCircle({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }

interface Membership {
    id: string
    status: string
    plan: string
    started_at: string
    expires_at: string
    contact_real_name: string | null
    contact_push_name: string | null
    contact_phone: string | null
    company_name: string | null
    effectiveStatus: string
    daysLeft: number
}

export function MembershipsTable({ memberships }: { memberships: Membership[] }) {
    const router = useRouter()
    const [showAll, setShowAll] = useState(false)
    const [renewingId, setRenewingId] = useState<string | null>(null)
    const [renewedIds, setRenewedIds] = useState<Set<string>>(new Set())

    const displayed = showAll ? memberships : memberships.slice(0, 10)

    const handleRenew = async (membershipId: string) => {
        setRenewingId(membershipId)
        try {
            const res = await fetch('/api/admin/renew-membership', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ membershipId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setRenewedIds(prev => new Set(prev).add(membershipId))
            // Refresh server data after a brief delay to show the checkmark
            setTimeout(() => router.refresh(), 1500)
        } catch (err: any) {
            alert('Error renovando: ' + err.message)
        } finally {
            setRenewingId(null)
        }
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Package size={20} className="text-primary" />
                    Membresías
                </h3>
                <div className="flex gap-2">
                    <span className="text-xs font-bold px-3 py-1.5 bg-green-50 text-green-600 rounded-lg">
                        {memberships.filter(m => m.effectiveStatus === 'active').length} activas
                    </span>
                    <span className="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-500 rounded-lg">
                        {memberships.filter(m => m.effectiveStatus === 'expired').length} expiradas
                    </span>
                </div>
            </div>

            <table className="w-full text-left font-medium">
                <thead>
                    <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expira en</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Renovar</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {displayed.map((m, index) => {
                        const isRenewing = renewingId === m.id
                        const justRenewed = renewedIds.has(m.id)

                        return (
                            <tr key={`${m.id}-${index}`} className="hover:bg-gray-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">
                                                {m.contact_real_name || m.contact_push_name || 'Sin nombre'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">{m.contact_phone}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-primary/5 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        {m.plan}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    <div className={cn("flex items-center gap-1.5 font-bold", m.daysLeft > 0 ? 'text-green-600' : 'text-red-500')}>
                                        <Calendar size={14} />
                                        <span>{m.daysLeft} días</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        m.effectiveStatus === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                                    )}>
                                        {m.effectiveStatus === 'active' ? 'Activa' : 'Expirada'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {justRenewed ? (
                                        <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
                                            <CheckCircle size={16} />
                                            Renovada
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleRenew(m.id)}
                                            disabled={isRenewing}
                                            title="Renovar por 3 meses"
                                            className={cn(
                                                "p-2 rounded-xl transition-all",
                                                isRenewing
                                                    ? "text-amber-500"
                                                    : "text-gray-400 hover:text-primary hover:bg-primary/5"
                                            )}
                                        >
                                            <RefreshCcw
                                                size={16}
                                                className={isRenewing ? 'animate-spin' : ''}
                                            />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            <div className="p-4 bg-gray-50/50 text-center">
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-xs font-bold text-gray-500 hover:text-black transition"
                >
                    {showAll
                        ? 'Mostrar menos'
                        : `Ver todas las suscripciones (${memberships.length})`
                    }
                </button>
            </div>
        </div>
    )
}
