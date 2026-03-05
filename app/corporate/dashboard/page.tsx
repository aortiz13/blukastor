import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany, getCorporateMetrics } from '@/lib/actions/corporate-helpers'
import { Users, CreditCard, FileCheck, TrendingUp, Activity, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function CorporateDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    const metrics = await getCorporateMetrics(supabase, activeCompany.companyId)

    // Get company details
    const { data: companyDetails } = await supabase
        .from('client_companies')
        .select('*')
        .eq('id', activeCompany.companyId)
        .single()

    // Get recent users  
    const { data: recentUsers } = await supabase
        .from('contacts')
        .select('id, phone, push_name, real_name, first_seen, last_seen')
        .eq('client_company_id', activeCompany.companyId)
        .order('first_seen', { ascending: false })
        .limit(5)

    // Get recent memberships
    const { data: recentMemberships } = await supabase
        .schema('wa')
        .from('memberships')
        .select('id, plan, status, started_at, expires_at, contact_id, contacts!inner(phone, push_name)')
        .eq('client_company_id', activeCompany.companyId)
        .order('started_at', { ascending: false })
        .limit(5)

    const kpiCards = [
        {
            label: 'Total Usuarios',
            value: metrics.totalUsers,
            icon: Users,
            color: 'blue',
            gradient: 'from-blue-500 to-blue-600',
        },
        {
            label: 'Membresías Activas',
            value: metrics.activeMemberships,
            icon: CreditCard,
            color: 'emerald',
            gradient: 'from-emerald-500 to-emerald-600',
        },
        {
            label: 'Cumplimiento T&C',
            value: `${metrics.complianceRate}%`,
            subtitle: `${metrics.acceptedCompliance}/${metrics.totalCompliance}`,
            icon: FileCheck,
            color: 'purple',
            gradient: 'from-purple-500 to-purple-600',
        },
        {
            label: 'Planes Disponibles',
            value: metrics.totalPlans,
            icon: TrendingUp,
            color: 'amber',
            gradient: 'from-amber-500 to-amber-600',
        },
    ]

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Vista general de <span className="font-semibold text-gray-700">{activeCompany.companyName}</span>
                    </p>
                </div>
                {companyDetails && (
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                            companyDetails.instance_status === 'active' ? "bg-green-100 text-green-700" :
                                companyDetails.instance_status === 'trial' ? "bg-yellow-100 text-yellow-700" :
                                    "bg-gray-100 text-gray-700"
                        )}>
                            {companyDetails.instance_status}
                        </span>
                        <span className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider",
                            companyDetails.subscription_tier === 'enterprise' ? "bg-purple-100 text-purple-700" :
                                companyDetails.subscription_tier === 'professional' ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-700"
                        )}>
                            {companyDetails.subscription_tier}
                        </span>
                    </div>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((card) => (
                    <div key={card.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "p-3 rounded-2xl bg-gradient-to-br text-white",
                                card.gradient
                            )}>
                                <card.icon size={22} />
                            </div>
                            <ArrowUpRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
                        <p className="text-3xl font-black text-gray-900 mt-1">{card.value}</p>
                        {card.subtitle && (
                            <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Two Column Layout: Recent Users + Recent Memberships */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Users */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <Users size={18} className="text-gray-400" />
                            Usuarios Recientes
                        </h2>
                        <a href="/corporate/users" className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
                            Ver todos →
                        </a>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentUsers?.map((contact) => (
                            <div key={contact.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold text-sm">
                                        {(contact.push_name || contact.phone).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{contact.push_name || 'Sin nombre'}</p>
                                        <p className="text-xs text-gray-400 font-mono">{contact.phone}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-gray-400">
                                    {contact.first_seen ? new Date(contact.first_seen).toLocaleDateString() : '—'}
                                </span>
                            </div>
                        ))}
                        {(!recentUsers || recentUsers.length === 0) && (
                            <div className="px-6 py-8 text-center text-gray-400 text-sm">No hay usuarios registrados</div>
                        )}
                    </div>
                </div>

                {/* Recent Memberships */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <CreditCard size={18} className="text-gray-400" />
                            Membresías Recientes
                        </h2>
                        <a href="/corporate/memberships" className="text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
                            Ver todas →
                        </a>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentMemberships?.map((mem: any) => (
                            <div key={mem.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        mem.status === 'active' ? "bg-green-500" : "bg-gray-300"
                                    )} />
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{mem.contacts?.push_name || mem.contacts?.phone || 'Unknown'}</p>
                                        <p className="text-xs text-gray-400">{mem.plan}</p>
                                    </div>
                                </div>
                                <span className={cn(
                                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    mem.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                )}>
                                    {mem.status}
                                </span>
                            </div>
                        ))}
                        {(!recentMemberships || recentMemberships.length === 0) && (
                            <div className="px-6 py-8 text-center text-gray-400 text-sm">No hay membresías registradas</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
