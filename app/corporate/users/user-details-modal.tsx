'use client'

import { useState, useEffect } from 'react'
import {
    X, Loader2, Phone, Calendar, Clock, Tag, CreditCard,
    FileText, Bot, Trash2, AlertTriangle, Check, User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserDetailsModalProps {
    contactId: string
    contactName: string
    companyId: string
    onClose: () => void
    onDeleted: () => void
}

interface UserDetails {
    contact: {
        id: string
        phone: string | null
        push_name: string | null
        real_name: string | null
        nickname: string | null
        first_seen: string | null
        last_seen: string | null
        tags: string[] | null
        notes: string | null
        user_id: string | null
    }
    membership: {
        plan: string
        status: string
        started_at: string | null
        expires_at: string | null
        notes: string | null
    } | null
    compliance: {
        terms_accepted: boolean
        accepted_at: string | null
    } | null
    aiEnabled: boolean
}

export default function UserDetailsModal({ contactId, contactName, companyId, onClose, onDeleted }: UserDetailsModalProps) {
    const [details, setDetails] = useState<UserDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [aiToggling, setAiToggling] = useState(false)
    const [aiEnabled, setAiEnabled] = useState(true)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')

    useEffect(() => {
        fetchDetails()
    }, [contactId])

    const fetchDetails = async () => {
        try {
            const res = await fetch(`/api/corporate/user-details?contactId=${contactId}`)
            if (res.ok) {
                const data = await res.json()
                setDetails(data)
                setAiEnabled(data.aiEnabled)
            }
        } catch (err) {
            console.error('Error fetching user details:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleAiToggle = async () => {
        setAiToggling(true)
        const newValue = !aiEnabled
        try {
            const res = await fetch('/api/corporate/user-ai-toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId, enabled: newValue }),
            })
            if (res.ok) {
                setAiEnabled(newValue)
            }
        } catch (err) {
            console.error('Error toggling AI:', err)
        } finally {
            setAiToggling(false)
        }
    }

    const handleDelete = async () => {
        setDeleting(true)
        setDeleteError('')
        try {
            const res = await fetch('/api/corporate/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId }),
            })
            if (res.ok) {
                onDeleted()
                onClose()
            } else {
                const data = await res.json()
                setDeleteError(data.error || 'Error al eliminar')
            }
        } catch (err: any) {
            setDeleteError(err.message || 'Error de red')
        } finally {
            setDeleting(false)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        })
    }

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return null
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    const displayName = details?.contact
        ? details.contact.real_name || details.contact.push_name || details.contact.nickname || details.contact.phone || 'Sin nombre'
        : contactName

    const hasPortalAccess = details?.contact?.user_id && details.contact.user_id !== '00000000-0000-0000-0000-000000000000'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg border border-white/20">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{displayName}</h2>
                            {details?.contact?.phone && (
                                <p className="text-gray-400 text-sm font-mono">{details.contact.phone}</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 size={24} className="text-gray-400 animate-spin" />
                            <p className="text-sm text-gray-400">Cargando detalles...</p>
                        </div>
                    ) : details ? (
                        <>
                            {/* Contact Info */}
                            <section>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <User size={12} />
                                    Información
                                </h3>
                                <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                                    <InfoRow label="Nombre real" value={details.contact.real_name} />
                                    <InfoRow label="WhatsApp" value={details.contact.push_name} />
                                    {details.contact.nickname && <InfoRow label="Apodo" value={details.contact.nickname} />}
                                    <InfoRow
                                        label="Teléfono"
                                        value={details.contact.phone}
                                        icon={<Phone size={12} className="text-gray-400" />}
                                        mono
                                    />
                                    <InfoRow
                                        label="Primera visita"
                                        value={formatDate(details.contact.first_seen)}
                                        icon={<Calendar size={12} className="text-gray-400" />}
                                    />
                                    <InfoRow
                                        label="Última actividad"
                                        value={formatDateTime(details.contact.last_seen)}
                                        icon={<Clock size={12} className="text-gray-400" />}
                                    />
                                    {hasPortalAccess && (
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Portal Activo</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Membership */}
                            {details.membership && (
                                <section>
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <CreditCard size={12} />
                                        Membresía
                                    </h3>
                                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                details.membership.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                                            )}>
                                                {details.membership.plan}
                                            </span>
                                            <span className="text-xs text-gray-400">({details.membership.status})</span>
                                        </div>
                                        <InfoRow label="Inicio" value={formatDate(details.membership.started_at)} />
                                        <InfoRow label="Vencimiento" value={formatDate(details.membership.expires_at)} />
                                    </div>
                                </section>
                            )}

                            {/* Compliance */}
                            {details.compliance && (
                                <section>
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <FileText size={12} />
                                        Cumplimiento
                                    </h3>
                                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                                        <InfoRow
                                            label="Términos & Condiciones"
                                            value={details.compliance.terms_accepted ? '✅ Aceptado' : '⏳ Pendiente'}
                                        />
                                        {details.compliance.accepted_at && (
                                            <InfoRow label="Fecha" value={formatDateTime(details.compliance.accepted_at)} />
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Tags */}
                            {details.contact.tags && details.contact.tags.length > 0 && (
                                <section>
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <Tag size={12} />
                                        Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {details.contact.tags.map((tag: string) => (
                                            <span key={tag} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* AI Agent Toggle */}
                            <section>
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Bot size={12} />
                                    Agente AI
                                </h3>
                                <div className="bg-gray-50 rounded-2xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                {aiEnabled ? 'Activado' : 'Desactivado'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {aiEnabled
                                                    ? 'El agente AI responde a este usuario'
                                                    : 'El agente AI no responderá a este usuario'
                                                }
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleAiToggle}
                                            disabled={aiToggling}
                                            className={cn(
                                                "relative w-12 h-7 rounded-full transition-colors duration-200 flex-shrink-0",
                                                aiEnabled ? "bg-green-500" : "bg-gray-300",
                                                aiToggling && "opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 flex items-center justify-center",
                                                aiEnabled ? "translate-x-5" : "translate-x-0.5"
                                            )}>
                                                {aiToggling ? (
                                                    <Loader2 size={12} className="text-gray-400 animate-spin" />
                                                ) : aiEnabled ? (
                                                    <Check size={12} className="text-green-600" />
                                                ) : (
                                                    <X size={12} className="text-gray-400" />
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* Delete Section */}
                            <section>
                                <div className="border border-red-200 rounded-2xl p-4 bg-red-50/50">
                                    <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <AlertTriangle size={12} />
                                        Zona Peligrosa
                                    </h3>
                                    {!showDeleteConfirm ? (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition"
                                        >
                                            <Trash2 size={14} />
                                            Eliminar usuario permanentemente
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-xs text-red-600 font-medium">
                                                ¿Estás seguro? Se eliminarán <strong>todos los datos</strong> de este usuario: contacto, membresía, historial de chat, contexto AI, transacciones financieras, metas y tareas. Esta acción es <strong>irreversible</strong>.
                                            </p>
                                            {deleteError && (
                                                <p className="text-xs text-red-500 bg-red-100 rounded-lg px-3 py-2">{deleteError}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                                                    disabled={deleting}
                                                    className="flex-1 bg-white text-gray-600 py-2 rounded-lg font-bold text-sm border border-gray-200 hover:bg-gray-50 transition"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    disabled={deleting}
                                                    className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-red-500 transition flex items-center justify-center gap-1.5"
                                                >
                                                    {deleting ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={14} />
                                                    )}
                                                    {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-sm text-gray-400">No se pudieron cargar los detalles</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function InfoRow({ label, value, icon, mono }: { label: string; value?: string | null; icon?: React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-start gap-2">
            {icon && <div className="mt-0.5">{icon}</div>}
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                <p className={cn("text-sm font-semibold text-gray-900 truncate", mono && "font-mono")}>
                    {value || <span className="text-gray-300 font-normal">—</span>}
                </p>
            </div>
        </div>
    )
}
