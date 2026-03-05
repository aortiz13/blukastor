import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { CreditCard, Users, DollarSign, Calendar, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function CorporateMembershipsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Fetch plans
    const { data: plans } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('client_company_id', activeCompany.companyId)
        .order('price', { ascending: true })

    // Fetch all memberships with contact info
    const { data: memberships } = await supabase
        .schema('wa')
        .from('memberships')
        .select('*, contacts!inner(phone, push_name, real_name)')
        .eq('client_company_id', activeCompany.companyId)
        .order('started_at', { ascending: false })

    const allMemberships = memberships || []
    const activeMemberships = allMemberships.filter(m => m.status === 'active')
    const expiredMemberships = allMemberships.filter(m => m.status !== 'active')
    const totalRevenue = (plans || []).reduce((sum, p) => {
        const planMembers = allMemberships.filter(m => m.plan_id === p.id && m.status === 'active')
        return sum + (planMembers.length * (p.price || 0))
    }, 0)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Membresías</h1>
                <p className="text-gray-500 mt-1">
                    Planes y suscripciones de <span className="font-semibold text-gray-700">{activeCompany.companyName}</span>
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Planes', value: (plans || []).length, icon: Package, gradient: 'from-indigo-500 to-indigo-600' },
                    { label: 'Activas', value: activeMemberships.length, icon: CreditCard, gradient: 'from-green-500 to-green-600' },
                    { label: 'Expiradas', value: expiredMemberships.length, icon: Calendar, gradient: 'from-gray-400 to-gray-500' },
                    { label: 'Ingreso Estimado', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, gradient: 'from-emerald-500 to-emerald-600' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={cn("p-3 rounded-2xl bg-gradient-to-br text-white", stat.gradient)}>
                            <stat.icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Plans Grid */}
            {plans && plans.length > 0 && (
                <div>
                    <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                        <Package size={20} className="text-gray-400" />
                        Planes Disponibles
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan: any) => {
                            const planMemberCount = allMemberships.filter(m => m.plan_id === plan.id && m.status === 'active').length
                            return (
                                <div key={plan.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                                        <span className="text-2xl font-black text-gray-900">
                                            ${plan.price || 0}
                                        </span>
                                    </div>
                                    {plan.description && (
                                        <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                                    )}
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Users size={16} />
                                            <span>{planMemberCount} miembros activos</span>
                                        </div>
                                        {plan.duration_days && (
                                            <span className="text-xs text-gray-400">{plan.duration_days} días</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Memberships Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <CreditCard size={18} className="text-gray-400" />
                        Todas las Membresías
                    </h2>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inicio</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expiración</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Notas</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {allMemberships.map((mem: any) => (
                            <tr key={mem.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{mem.contacts?.push_name || 'Sin nombre'}</p>
                                        <p className="text-xs text-gray-400 font-mono">{mem.contacts?.phone}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                                        {mem.plan}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        mem.status === 'active' ? "bg-green-100 text-green-700" :
                                            mem.status === 'expired' ? "bg-gray-100 text-gray-500" :
                                                "bg-red-100 text-red-700"
                                    )}>
                                        {mem.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {mem.started_at ? new Date(mem.started_at).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {mem.expires_at ? new Date(mem.expires_at).toLocaleDateString() : '—'}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400 max-w-[200px] truncate">
                                    {mem.notes || '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {allMemberships.length === 0 && (
                    <div className="text-center py-12">
                        <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No hay membresías registradas</p>
                        <p className="text-gray-400 text-sm">Las membresías aparecerán aquí cuando los usuarios se suscriban</p>
                    </div>
                )}
            </div>
        </div>
    )
}
