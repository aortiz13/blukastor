'use client'

import { useState, useMemo } from 'react'
import { Search, Building, Filter } from 'lucide-react'
import { UserActionsDropdown } from './user-actions-dropdown'
import { UserFiltersModal, EMPTY_FILTERS, type UserFilters } from './user-filters-modal'

export interface UserRow {
    id: string
    auth_user_id: string
    email?: string
    phone?: string
    real_name?: string
    push_name?: string
    nickname?: string
    role?: string
    company_id?: string
    company_name?: string
    last_sign_in_at?: string
    last_seen?: string
    created_at?: string
    is_admin: boolean
    is_wa_only: boolean
    is_banned: boolean
}

interface UsersTableClientProps {
    users: UserRow[]
    companies: string[]
}

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }

export function UsersTableClient({ users, companies }: UsersTableClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS)
    const [filtersOpen, setFiltersOpen] = useState(false)

    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.company) count++
        if (filters.phone) count++
        if (filters.status !== 'all') count++
        if (filters.createdFrom || filters.createdTo) count++
        if (filters.lastActivityFrom || filters.lastActivityTo) count++
        return count
    }, [filters])

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Search query
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                const matchesSearch =
                    user.email?.toLowerCase().includes(q) ||
                    user.real_name?.toLowerCase().includes(q) ||
                    user.push_name?.toLowerCase().includes(q) ||
                    user.nickname?.toLowerCase().includes(q) ||
                    user.phone?.toLowerCase().includes(q) ||
                    user.auth_user_id?.toLowerCase().includes(q)
                if (!matchesSearch) return false
            }

            // Company filter
            if (filters.company && user.company_name !== filters.company) return false

            // Phone filter
            if (filters.phone) {
                const phoneQ = filters.phone.toLowerCase()
                if (!user.phone?.toLowerCase().includes(phoneQ)) return false
            }

            // Status filter
            if (filters.status === 'active' && user.is_banned) return false
            if (filters.status === 'banned' && !user.is_banned) return false

            // Created date range
            if (filters.createdFrom && user.created_at) {
                if (new Date(user.created_at) < new Date(filters.createdFrom)) return false
            }
            if (filters.createdTo && user.created_at) {
                const toDate = new Date(filters.createdTo)
                toDate.setHours(23, 59, 59, 999)
                if (new Date(user.created_at) > toDate) return false
            }

            // Last activity date range
            if (filters.lastActivityFrom || filters.lastActivityTo) {
                const lastActivity = user.last_seen || user.last_sign_in_at
                if (!lastActivity) return false
                const activityDate = new Date(lastActivity)

                if (filters.lastActivityFrom && activityDate < new Date(filters.lastActivityFrom)) return false
                if (filters.lastActivityTo) {
                    const toDate = new Date(filters.lastActivityTo)
                    toDate.setHours(23, 59, 59, 999)
                    if (activityDate > toDate) return false
                }
            }

            return true
        })
    }, [users, searchQuery, filters])

    return (
        <>
            <UserFiltersModal
                isOpen={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={filters}
                onApply={setFilters}
                companies={companies}
            />

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre, email o ID..."
                            className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                        />
                    </div>
                    <button
                        onClick={() => setFiltersOpen(true)}
                        className={cn(
                            "px-4 py-3 rounded-xl font-bold border shadow-sm flex items-center gap-2 transition",
                            activeFilterCount > 0
                                ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                                : "bg-white text-gray-700 border-gray-100 hover:bg-gray-50"
                        )}
                    >
                        <Filter size={18} />
                        <span>Filtros</span>
                        {activeFilterCount > 0 && (
                            <span className="bg-white text-gray-900 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Active filters pills */}
                {activeFilterCount > 0 && (
                    <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Filtros:</span>
                        {filters.company && (
                            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                <Building size={12} />
                                {filters.company}
                                <button onClick={() => setFilters({ ...filters, company: '' })} className="ml-1 hover:text-blue-900">×</button>
                            </span>
                        )}
                        {filters.phone && (
                            <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                Tel: {filters.phone}
                                <button onClick={() => setFilters({ ...filters, phone: '' })} className="ml-1 hover:text-purple-900">×</button>
                            </span>
                        )}
                        {filters.status !== 'all' && (
                            <span className={cn(
                                "text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1",
                                filters.status === 'banned' ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                            )}>
                                {filters.status === 'banned' ? 'Baneado' : 'Activo'}
                                <button onClick={() => setFilters({ ...filters, status: 'all' })} className="ml-1 hover:opacity-70">×</button>
                            </span>
                        )}
                        {(filters.createdFrom || filters.createdTo) && (
                            <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                Creación: {filters.createdFrom || '...'} → {filters.createdTo || '...'}
                                <button onClick={() => setFilters({ ...filters, createdFrom: '', createdTo: '' })} className="ml-1 hover:text-orange-900">×</button>
                            </span>
                        )}
                        {(filters.lastActivityFrom || filters.lastActivityTo) && (
                            <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                Actividad: {filters.lastActivityFrom || '...'} → {filters.lastActivityTo || '...'}
                                <button onClick={() => setFilters({ ...filters, lastActivityFrom: '', lastActivityTo: '' })} className="ml-1 hover:text-teal-900">×</button>
                            </span>
                        )}
                        <button
                            onClick={() => setFilters(EMPTY_FILTERS)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 ml-2 transition"
                        >
                            Limpiar todo
                        </button>
                    </div>
                )}

                {/* Results count */}
                {(searchQuery || activeFilterCount > 0) && (
                    <div className="px-6 py-2 border-b border-gray-50">
                        <p className="text-xs text-gray-500">
                            Mostrando <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> usuarios
                        </p>
                    </div>
                )}

                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empresa</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Última Sesión</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <p className="text-gray-400 font-bold">No se encontraron usuarios</p>
                                    <p className="text-gray-400 text-sm mt-1">Intenta ajustar los filtros o la búsqueda</p>
                                </td>
                            </tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id || user.auth_user_id} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-xs">
                                            {user.email?.charAt(0).toUpperCase()
                                                || user.real_name?.charAt(0).toUpperCase()
                                                || user.push_name?.charAt(0).toUpperCase()
                                                || user.phone?.charAt(0)
                                                || 'U'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {user.email || user.real_name || user.push_name || user.nickname || user.phone}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {user.email
                                                    ? user.phone
                                                    : (user.is_wa_only ? 'WhatsApp' : user.auth_user_id?.slice(0, 8) + '...')}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {user.is_admin ? (
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                user.role === 'super_admin' ? "bg-purple-100 text-purple-700" :
                                                    user.role === 'admin' ? "bg-green-100 text-green-700" :
                                                        "bg-gray-100 text-gray-700"
                                            )}>
                                                {user.role || 'Admin'}
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                                                Usuario
                                            </span>
                                        )}
                                        {user.is_banned && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                                Banneado
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Building size={14} className="text-gray-400" />
                                        <span>{user.company_name || 'Sin empresa'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {(user.last_seen || user.last_sign_in_at)
                                        ? new Date(user.last_seen || user.last_sign_in_at!).toLocaleDateString('es-ES', {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : 'Nunca'
                                    }
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <UserActionsDropdown
                                        userId={user.is_wa_only ? user.id : user.auth_user_id}
                                        userEmail={user.email || user.phone || ''}
                                        companyId={user.company_id}
                                        isAdmin={user.is_admin}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}
