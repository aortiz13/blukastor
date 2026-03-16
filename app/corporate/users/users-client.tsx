'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
    Search, Phone, Calendar, Tag, Users,
    MessageCircle, Check, X, Loader2, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react'
import UserActionsMenu from './user-actions-menu'

interface Contact {
    id: string
    phone: string | null
    push_name: string | null
    real_name: string | null
    first_seen: string | null
    last_seen: string | null
    tags: string[] | null
    nickname: string | null
    user_id: string | null
    has_portal_access: boolean
}

interface Membership {
    plan: string
    status: string
}

interface UsersClientProps {
    contacts: Contact[]
    membershipMap: Record<string, Membership>
    companyName: string
    companyPortalUrl: string
    companyId: string
}

interface InviteResult {
    contactId: string
    name: string
    phone: string
    status: 'pending' | 'success' | 'error'
    message?: string
}

export default function UsersClient({ contacts, membershipMap, companyName, companyPortalUrl, companyId }: UsersClientProps) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [showConfirm, setShowConfirm] = useState(false)
    const [sending, setSending] = useState(false)
    const [results, setResults] = useState<InviteResult[]>([])
    const [showResults, setShowResults] = useState(false)

    // Filter contacts by search term
    const filtered = contacts.filter(c => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            c.push_name?.toLowerCase().includes(q) ||
            c.real_name?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.nickname?.toLowerCase().includes(q) ||
            c.tags?.some(t => t.toLowerCase().includes(q))
        )
    })

    // Only contacts with phone can be invited
    const selectableContacts = filtered.filter(c => c.phone && !c.has_portal_access)
    const allSelectableSelected = selectableContacts.length > 0 && selectableContacts.every(c => selected.has(c.id))

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAll = () => {
        if (allSelectableSelected) {
            setSelected(new Set())
        } else {
            setSelected(new Set(selectableContacts.map(c => c.id)))
        }
    }

    const selectedContacts = contacts.filter(c => selected.has(c.id) && c.phone)

    const handleInvite = async () => {
        setSending(true)
        const inviteResults: InviteResult[] = selectedContacts.map(c => ({
            contactId: c.id,
            name: c.push_name || c.nickname || c.phone || 'Sin nombre',
            phone: c.phone!,
            status: 'pending' as const,
        }))
        setResults([...inviteResults])
        setShowConfirm(false)
        setShowResults(true)

        for (let i = 0; i < inviteResults.length; i++) {
            const contact = selectedContacts[i]
            try {
                const res = await fetch('/api/corporate/invite-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: contact.phone!.replace(/[^0-9]/g, ''),
                        role: 'client',
                        channel: 'whatsapp',
                    }),
                })
                const data = await res.json()
                if (!res.ok) {
                    inviteResults[i] = { ...inviteResults[i], status: 'error', message: data.error || 'Error desconocido' }
                } else {
                    inviteResults[i] = { ...inviteResults[i], status: 'success' }
                }
            } catch (err: any) {
                inviteResults[i] = { ...inviteResults[i], status: 'error', message: err.message || 'Error de red' }
            }
            setResults([...inviteResults])
        }

        setSending(false)
        setSelected(new Set())
    }

    const closeResults = () => {
        setShowResults(false)
        setResults([])
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return (
        <>
            {/* Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                <Search size={20} className="text-gray-400 ml-2" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, teléfono o tags..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium"
                />
            </div>

            {/* Floating Action Bar */}
            {selected.size > 0 && (
                <div className="sticky top-4 z-30 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 flex items-center justify-between shadow-xl shadow-black/20">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 rounded-lg px-2.5 py-1">
                                <span className="font-black text-sm">{selected.size}</span>
                            </div>
                            <span className="text-sm text-gray-300 font-medium">
                                usuario{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelected(new Set())}
                                className="text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/10 text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 transition text-sm"
                            >
                                <MessageCircle size={14} />
                                Invitar al Portal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teléfono</th>
                            <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-16">
                                <input
                                    type="checkbox"
                                    checked={allSelectableSelected}
                                    onChange={toggleAll}
                                    className="w-4 h-4 accent-gray-900 rounded cursor-pointer"
                                    title="Seleccionar todos para WhatsApp"
                                />
                            </th>
                            <th className="px-4 py-4 w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map((contact) => {
                            const isSelected = selected.has(contact.id)
                            const canSelect = !!contact.phone
                            return (
                                <tr
                                    key={contact.id}
                                    className={cn(
                                        "hover:bg-gray-50/50 transition-colors group",
                                        isSelected && "bg-blue-50/40"
                                    )}
                                >
                                    <td className="px-6 py-4">
                                        <Link href={`/corporate/users/${contact.id}`} className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                                {(contact.push_name || contact.phone || '?').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-bold text-gray-900 text-sm">{contact.push_name || contact.nickname || 'Sin nombre'}</p>
                                                    {contact.has_portal_access && (
                                                        <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold uppercase">Portal</span>
                                                    )}
                                                </div>
                                                {contact.real_name && (
                                                    <p className="text-xs text-gray-400">{contact.real_name}</p>
                                                )}
                                            </div>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-gray-600">{contact.phone}</td>
                                    <td className="px-4 py-4 text-center">
                                        {canSelect ? (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(contact.id)}
                                                className="w-4 h-4 accent-gray-900 rounded cursor-pointer"
                                            />
                                        ) : contact.has_portal_access ? (
                                            <div className="w-4 h-4 flex items-center justify-center mx-auto" title="Ya registrado en el portal">
                                                <Check size={14} className="text-green-500" />
                                            </div>
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <UserActionsMenu
                                            contactId={contact.id}
                                            contactName={contact.push_name || contact.nickname || contact.phone || 'Sin nombre'}
                                            companyId={companyId}
                                            onDeleted={() => router.refresh()}
                                        />
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

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 pt-6 pb-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                    <MessageCircle size={18} className="text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Invitar al Portal via WhatsApp</h3>
                                    <p className="text-xs text-gray-400">{companyName}</p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-4">
                                Se enviará una invitación por WhatsApp a <strong>{selectedContacts.length}</strong> usuario{selectedContacts.length !== 1 ? 's' : ''} para unirse al portal web como <strong>cliente</strong>.
                            </p>

                            <div className="max-h-48 overflow-y-auto space-y-1.5 mb-4">
                                {selectedContacts.map(c => (
                                    <div key={c.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-xs">
                                            {(c.push_name || c.phone || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{c.push_name || c.nickname || 'Sin nombre'}</p>
                                            <p className="text-xs text-gray-400 font-mono">{c.phone}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 mb-4">
                                <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
                                    <AlertCircle size={12} />
                                    Cada usuario recibirá un enlace único para registrarse en el portal.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-2">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleInvite}
                                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-500 transition flex items-center justify-center gap-1.5 text-sm"
                            >
                                <MessageCircle size={14} />
                                Enviar Invitaciones
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Modal */}
            {showResults && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 pt-6 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        sending ? "bg-blue-100" : errorCount > 0 ? "bg-amber-100" : "bg-green-100"
                                    )}>
                                        {sending ? (
                                            <Loader2 size={18} className="text-blue-600 animate-spin" />
                                        ) : errorCount > 0 ? (
                                            <AlertCircle size={18} className="text-amber-600" />
                                        ) : (
                                            <CheckCircle2 size={18} className="text-green-600" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">
                                            {sending ? 'Enviando invitaciones...' : 'Resultado'}
                                        </h3>
                                        {!sending && (
                                            <p className="text-xs text-gray-400">
                                                {successCount} enviadas • {errorCount} errores
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {!sending && (
                                    <button onClick={closeResults} className="text-gray-300 hover:text-gray-500 transition">
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            {sending && (
                                <div className="mb-3">
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full transition-all duration-300"
                                            style={{ width: `${(results.filter(r => r.status !== 'pending').length / results.length) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center mt-1.5">
                                        {results.filter(r => r.status !== 'pending').length} / {results.length}
                                    </p>
                                </div>
                            )}

                            <div className="max-h-64 overflow-y-auto space-y-1.5">
                                {results.map(r => (
                                    <div key={r.contactId} className={cn(
                                        "flex items-center gap-3 p-2.5 rounded-xl transition-colors",
                                        r.status === 'pending' ? "bg-gray-50" :
                                        r.status === 'success' ? "bg-green-50/60" : "bg-red-50/60"
                                    )}>
                                        <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                                            {r.status === 'pending' && <Loader2 size={14} className="text-gray-400 animate-spin" />}
                                            {r.status === 'success' && <CheckCircle2 size={14} className="text-green-600" />}
                                            {r.status === 'error' && <XCircle size={14} className="text-red-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{r.phone}</p>
                                        </div>
                                        {r.status === 'error' && r.message && (
                                            <p className="text-[10px] text-red-500 font-medium max-w-[120px] truncate">{r.message}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!sending && (
                            <div className="px-6 pb-6">
                                <button
                                    onClick={closeResults}
                                    className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-bold hover:bg-gray-800 transition text-sm"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
