import { createClient } from '@/lib/supabase/server'
import { Users, Shield } from 'lucide-react'
import { InviteUserButton } from './invite-user-button'
import { BanUserButton } from './ban-user-button'
import { UsersTableClient } from './users-table-client'

export default async function UsersPage() {
    const supabase = await createClient()

    // Fetch all WhatsApp contacts with company names
    const { data: waContacts, error: waError } = await supabase
        .from('wa_contacts_view')
        .select(`
            *,
            client_companies!company_id (
                id,
                name
            )
        `)
        .order('created_at', { ascending: false })

    // Fetch admin users separately to merge role data
    const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users_view')
        .select('*')

    // Fetch banned users
    const { data: bannedUsers } = await supabase
        .from('banned_users')
        .select('*')

    // Create a set of banned phones for quick lookup
    const bannedPhones = new Set(
        bannedUsers?.map(b => b.phone) || []
    )

    if (waError) {
        return <div className="p-8 text-red-500">Error cargando usuarios: {waError.message}</div>
    }

    // Create a map of admin users by their user_id for quick lookup
    const adminMap = new Map(
        adminUsers?.map(admin => [admin.auth_user_id, admin]) || []
    )

    // Merge wa_contacts with admin data
    const users = waContacts?.map(contact => {
        const admin = adminMap.get(contact.user_id)
        const isNullUserId = contact.user_id === '00000000-0000-0000-0000-000000000000'

        return {
            id: contact.id,
            auth_user_id: contact.user_id,
            email: admin?.email,
            phone: contact.phone,
            real_name: contact.real_name,
            push_name: contact.push_name,
            nickname: contact.nickname,
            role: admin?.role,
            company_id: contact.company_id,
            // Prioritize company name from wa_contacts join, fallback to admin company
            company_name: (contact.client_companies as any)?.name || admin?.company_name,
            last_sign_in_at: admin?.last_sign_in_at,
            last_seen: contact.last_seen,
            created_at: contact.created_at,
            is_admin: !!admin,
            is_wa_only: isNullUserId, // WhatsApp contact without auth account
            is_banned: bannedPhones.has(contact.phone),
        }
    }) || []

    // Extract unique company names for filter dropdown
    const uniqueCompanies = [...new Set(
        users.map(u => u.company_name).filter(Boolean) as string[]
    )].sort()

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-gray-500 mt-1">Supervisa roles, accesos y sesiones de los usuarios de la plataforma.</p>
                </div>
                <div className="flex gap-2">
                    <InviteUserButton />
                    <BanUserButton />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Usuarios', value: users?.length || 0, icon: Users, color: 'blue' },
                    { label: 'Administradores', value: users?.filter(u => u.is_admin).length || 0, icon: Shield, color: 'purple' },
                    { label: 'Banneados', value: users?.filter(u => u.is_banned).length || 0, icon: ShieldBan, color: 'amber' },
                    {
                        label: 'Activos (30d)', value: users?.filter(u => {
                            const lastActivity = u.last_seen || u.last_sign_in_at
                            return lastActivity && new Date(lastActivity) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        }).length || 0, icon: TrendingUp, color: 'orange'
                    },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon size={20} className={cn(
                                stat.color === 'blue' ? "text-blue-600" :
                                    stat.color === 'purple' ? "text-purple-600" :
                                        stat.color === 'green' ? "text-green-600" :
                                            stat.color === 'amber' ? "text-amber-600" :
                                                "text-orange-600"
                            )} />
                            {stat.label !== 'Total Usuarios' && (
                                <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                            )}
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* User List with Filters */}
            <UsersTableClient users={users} companies={uniqueCompanies} />
        </div>
    )
}

function TrendingUp(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg> }
function ShieldBan(props: any) { return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><line x1="4" y1="4" x2="20" y2="20" /></svg> }
function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }
