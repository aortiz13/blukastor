'use client'

import { useState } from 'react'
import { X, Filter, RotateCcw, Building, Phone, ShieldCheck, Calendar } from 'lucide-react'

export interface UserFilters {
    company: string
    phone: string
    status: 'all' | 'active' | 'banned'
    createdFrom: string
    createdTo: string
    lastActivityFrom: string
    lastActivityTo: string
}

export const EMPTY_FILTERS: UserFilters = {
    company: '',
    phone: '',
    status: 'all',
    createdFrom: '',
    createdTo: '',
    lastActivityFrom: '',
    lastActivityTo: '',
}

interface UserFiltersModalProps {
    isOpen: boolean
    onClose: () => void
    filters: UserFilters
    onApply: (filters: UserFilters) => void
    companies: string[]
}

export function UserFiltersModal({ isOpen, onClose, filters, onApply, companies }: UserFiltersModalProps) {
    const [local, setLocal] = useState<UserFilters>(filters)

    const handleApply = () => {
        onApply(local)
        onClose()
    }

    const handleReset = () => {
        setLocal(EMPTY_FILTERS)
    }

    const hasFilters = local.company !== '' ||
        local.phone !== '' ||
        local.status !== 'all' ||
        local.createdFrom !== '' ||
        local.createdTo !== '' ||
        local.lastActivityFrom !== '' ||
        local.lastActivityTo !== ''

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Filter className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Filtros</h2>
                            <p className="text-sm text-white/80">Filtra la lista de usuarios</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-xl transition"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Empresa */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Empresa
                        </label>
                        <select
                            value={local.company}
                            onChange={(e) => setLocal({ ...local, company: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-transparent bg-white"
                        >
                            <option value="">Todas las empresas</option>
                            {companies.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Teléfono */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Teléfono
                        </label>
                        <input
                            type="text"
                            value={local.phone}
                            onChange={(e) => setLocal({ ...local, phone: e.target.value })}
                            placeholder="Buscar por teléfono..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-transparent"
                        />
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Estado
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {([
                                { value: 'all', label: 'Todos' },
                                { value: 'active', label: 'Activo' },
                                { value: 'banned', label: 'Baneado' },
                            ] as const).map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setLocal({ ...local, status: opt.value })}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition border ${local.status === opt.value
                                        ? opt.value === 'banned'
                                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                                            : opt.value === 'active'
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : 'bg-gray-900 text-white border-gray-900'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Fecha de Creación */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Fecha de Creación
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={local.createdFrom}
                                    onChange={(e) => setLocal({ ...local, createdFrom: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={local.createdTo}
                                    onChange={(e) => setLocal({ ...local, createdTo: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fecha de Última Actividad */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Fecha de Última Actividad
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                                <input
                                    type="date"
                                    value={local.lastActivityFrom}
                                    onChange={(e) => setLocal({ ...local, lastActivityFrom: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                                <input
                                    type="date"
                                    value={local.lastActivityTo}
                                    onChange={(e) => setLocal({ ...local, lastActivityTo: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-100 flex gap-3">
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition flex items-center gap-2 text-gray-600"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Limpiar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-6 py-3 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    )
}
