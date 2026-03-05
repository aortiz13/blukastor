import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { Users, Search, Phone, Calendar, Tag, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { InviteUserButton } from './invite-user-modal'

export default async function CorporateUsersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Fetch all contacts for this company
    const { data: contacts, error } = await supabase
        .from('contacts')
        .select('id, phone, push_name, real_name, first_seen, last_seen, tags, nickname, trial_started_at, trial_days')
        .eq('client_company_id', activeCompany.companyId)
        .order('first_seen', { ascending: false })

    // Get membership status for each contact
    const contactIds = contacts?.map(c => c.id) || []
    let membershipMap: Record<string, any> = {}
    if (contactIds.length > 0) {
        const { data: memberships } = await supabase
            .schema('wa')
            .from('memberships')
            .select('contact_id, plan, status')
            .eq('client_company_id', activeCompany.companyId)
            .in('contact_id', contactIds)

        memberships?.forEach(m => {
            membershipMap[m.contact_id] = m
        })
    }

    const totalUsers = contacts?.length || 0
    const activeUsers = contacts?.filter(c => {
        const lastSeen = c.last_seen ? new Date(c.last_seen) : null
        if (!lastSeen) return false
        const daysAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo <= 7
    }).length || 0

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Usuarios</h1>
                    <p className="text-gray-500 mt-1">
                        Todos los usuarios asociados a <span className="font-semibold text-gray-700">{activeCompany.companyName}</span>
                    </p>
                </div>
                <InviteUserButton companyName={activeCompany.companyName} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Usuarios</p>
                        <p className="text-2xl font-black text-gray-900">{totalUsers}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-green-50 text-green-600">
                        <Phone size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Activos (7d)</p>
                        <p className="text-2xl font-black text-gray-900">{activeUsers}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-purple-50 text-purple-600">
                        <Tag size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Con Membresía</p>
                        <p className="text-2xl font-black text-gray-900">
                            {Object.values(membershipMap).filter((m: any) => m.status === 'active').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                <Search size={20} className="text-gray-400 ml-2" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, teléfono o tags..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
                />
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teléfono</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Primera Visita</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Última Actividad</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Membresía</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tags</th>
                            <th className="px-6 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {contacts?.map((contact) => {
                            const membership = membershipMap[contact.id]
                            return (
                                <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <Link href={`/corporate/users/${contact.id}`} className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                                {(contact.push_name || contact.phone).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{contact.push_name || contact.nickname || 'Sin nombre'}</p>
                                                {contact.real_name && (
                                                    <p className="text-xs text-gray-400">{contact.real_name}</p>
                                                )}
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-gray-600">{contact.phone}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {contact.first_seen ? new Date(contact.first_seen).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {contact.last_seen ? new Date(contact.last_seen).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {membership ? (
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                membership.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {membership.plan}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {contact.tags?.slice(0, 3).map((tag: string) => (
                                                <span key={tag} className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] text-gray-500 font-medium">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link href={`/corporate/users/${contact.id}`} className="text-gray-300 group-hover:text-gray-500 transition-colors">
                                            <ChevronRight size={16} />
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {(!contacts || contacts.length === 0) && (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No hay usuarios registrados</p>
                        <p className="text-gray-400 text-sm">Los usuarios aparecerán aquí cuando interactúen con el sistema</p>
                    </div>
                )}
            </div>
        </div>
    )
}
