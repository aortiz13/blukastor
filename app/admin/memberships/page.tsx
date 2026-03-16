import { createClient } from '@/lib/supabase/server'
import { CreditCard, TrendingUp, Users, ArrowDownRight } from 'lucide-react'
import { BulkActivateButton } from './BulkActivateButton'
import { MembershipsTable } from './MembershipsTable'

export default async function MembershipsPage() {
    const supabase = await createClient()

    // Fetch memberships data
    const { data: memberships, error } = await supabase
        .from('membership_status_v2')
        .select('*')
        .order('expires_at', { ascending: true })

    if (error) {
        return <div className="p-8 text-red-500">Error cargando membresías: {error.message}</div>
    }

    // Compute effective status: active only if status='active' AND not expired
    const now = new Date()
    const withStatus = memberships?.map(m => {
        const expiresAt = new Date(m.expires_at)
        const isActive = m.status === 'active' && expiresAt > now
        const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 3600 * 24))
        return { ...m, effectiveStatus: isActive ? 'active' : 'expired', daysLeft }
    }) || []

    const activeMembers = withStatus.filter(m => m.effectiveStatus === 'active').length
    const cancelledMembers = withStatus.filter(m => m.status === 'cancelled').length
    const expiredMembers = withStatus.filter(m => m.effectiveStatus === 'expired').length
    const totalMembers = withStatus.length
    const churnRate = totalMembers > 0 ? ((cancelledMembers / totalMembers) * 100).toFixed(1) : '0'

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Membresías</h1>
                    <p className="text-gray-500 mt-1">Monitorea renovaciones, churn y rendimiento de planes de suscripción.</p>
                </div>
                <div className="flex gap-2 font-bold items-center">
                    <BulkActivateButton />
                    <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-green-600/20 flex items-center gap-2">
                        <TrendingUp size={20} />
                        <span>{activeMembers} activas</span>
                    </div>
                </div>
            </div>

            {/* Subscription Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Suscripciones Activas', value: activeMembers, icon: Users, sub: `${totalMembers} total`, color: 'blue' },
                    { label: 'Tasa de Cancelación (Churn)', value: `${churnRate}%`, icon: ArrowDownRight, sub: `${cancelledMembers} canceladas`, color: 'red' },
                    { label: 'Total Membresías', value: totalMembers, icon: CreditCard, sub: `${activeMembers} activas`, color: 'green' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "p-3 rounded-2xl",
                                stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                                    stat.color === 'red' ? "bg-red-50 text-red-600" :
                                        "bg-green-50 text-green-600"
                            )}>
                                <stat.icon size={20} />
                            </div>
                            <span className="text-xs font-bold px-2 py-1 rounded-full text-gray-500 bg-gray-50">{stat.sub}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Memberships Table */}
            <MembershipsTable memberships={withStatus} />
        </div>
    )
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
