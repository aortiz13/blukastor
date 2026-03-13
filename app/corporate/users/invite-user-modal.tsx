'use client'

import { useState } from 'react'
import {
    UserPlus, Loader2, XCircle, Mail, Link2, Copy, Check, Shield,
    LayoutDashboard, Users, FileText, ShieldAlert, CreditCard,
    TrendingUp, Palette, Bot, ExternalLink, MessageCircle, Phone
} from 'lucide-react'

interface InviteUserModalProps {
    companyName: string
    companyPortalUrl?: string
}

const CORPORATE_MODULES = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'compliance', label: 'Cumplimiento', icon: FileText },
    { key: 'escalation', label: 'Escalamiento', icon: ShieldAlert },
    { key: 'memberships', label: 'Membresías', icon: CreditCard },
    { key: 'finance', label: 'Finanzas', icon: TrendingUp },
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'agents', label: 'Agentes', icon: Bot },
]

interface ModulePermissions {
    modules: string[]
}

export function InviteUserButton({ companyName, companyPortalUrl }: InviteUserModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-black text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm"
            >
                <UserPlus size={16} />
                <span>Invitar Usuario</span>
            </button>
            {isOpen && <InviteModal companyName={companyName} companyPortalUrl={companyPortalUrl} onClose={() => setIsOpen(false)} />}
        </>
    )
}

function InviteModal({ companyName, companyPortalUrl, onClose }: { companyName: string; companyPortalUrl?: string; onClose: () => void }) {
    const [mode, setMode] = useState<'email' | 'whatsapp' | 'link'>('whatsapp')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [role, setRole] = useState('member')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [inviteLink, setInviteLink] = useState('')
    const [copied, setCopied] = useState(false)
    const [permissions, setPermissions] = useState<ModulePermissions>({ modules: [] })

    const toggleModule = (key: string) => {
        setPermissions(prev => ({
            modules: prev.modules.includes(key) ? prev.modules.filter(m => m !== key) : [...prev.modules, key],
        }))
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setLoading(true); setError(''); setSuccess(''); setInviteLink('')

        if (role === 'member' && permissions.modules.length === 0) {
            setError('Selecciona al menos un módulo'); setLoading(false); return
        }

        try {
            const res = await fetch('/api/corporate/invite-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: mode === 'email' ? email : undefined,
                    phone: mode === 'whatsapp' ? phone : undefined,
                    role, channel: mode,
                    ...(role === 'member' ? { permissions } : {}),
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Error'); return }
            if (mode === 'email') { setSuccess(`Enviado a ${email}`); setEmail('') }
            else if (mode === 'whatsapp') { setSuccess(`Enviado por WhatsApp a +${phone}`); setPhone('') }
            else { setInviteLink(data.inviteUrl) }
        } catch (err: any) { setError(err.message || 'Error de red') }
        finally { setLoading(false) }
    }

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(inviteLink)
        setCopied(true); setTimeout(() => setCopied(false), 2000)
    }

    const reset = () => { setError(''); setSuccess(''); setInviteLink('') }

    const roleLabels: Record<string, string> = {
        admin: 'Administrador', member: 'Miembro (Empleado)', client: 'Cliente',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-6 pb-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Invitar Usuario</h2>
                        <p className="text-gray-400 text-xs">{companyName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition">
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    {/* Row: Role + Channel side by side */}
                    <div className="flex gap-3 mb-4">
                        {/* Role */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                Rol
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5"
                            >
                                <option value="member">Miembro</option>
                                <option value="admin">Administrador</option>
                                <option value="client">Cliente</option>
                            </select>
                        </div>
                        {/* Channel */}
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                Canal
                            </label>
                            <div className="flex bg-gray-50 border border-gray-200 rounded-lg p-0.5">
                                {[
                                    { id: 'whatsapp' as const, icon: MessageCircle, color: 'text-green-600' },
                                    { id: 'email' as const, icon: Mail, color: 'text-gray-700' },
                                    { id: 'link' as const, icon: Link2, color: 'text-gray-700' },
                                ].map(ch => (
                                    <button
                                        key={ch.id}
                                        type="button"
                                        onClick={() => { setMode(ch.id); reset() }}
                                        className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition ${
                                            mode === ch.id ? `bg-white shadow-sm ${ch.color}` : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
                                        <ch.icon size={12} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Client portal info */}
                    {role === 'client' && companyPortalUrl && (
                        <div className="mb-4 p-3 bg-green-50/60 rounded-xl border border-green-100/60 flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <ExternalLink size={14} className="text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Portal de usuario</p>
                                <p className="text-xs text-green-700 font-mono truncate">{companyPortalUrl}</p>
                            </div>
                        </div>
                    )}

                    {/* Member modules — 2-column grid */}
                    {role === 'member' && (
                        <div className="mb-4 p-3 bg-blue-50/40 rounded-xl border border-blue-100/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                    <Shield size={10} /> Módulos permitidos
                                </span>
                                <div className="flex gap-1">
                                    <button type="button" onClick={() => setPermissions({ modules: CORPORATE_MODULES.map(m => m.key) })}
                                        className="text-[9px] font-bold text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded hover:bg-blue-100 transition">
                                        Todos
                                    </button>
                                    <button type="button" onClick={() => setPermissions({ modules: [] })}
                                        className="text-[9px] font-bold text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100 transition">
                                        Ninguno
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {CORPORATE_MODULES.map(mod => {
                                    const on = permissions.modules.includes(mod.key)
                                    return (
                                        <label key={mod.key} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm ${
                                            on ? 'bg-white shadow-sm border border-blue-200' : 'border border-transparent hover:bg-white/60'
                                        }`}>
                                            <input type="checkbox" checked={on} onChange={() => toggleModule(mod.key)}
                                                className="w-3.5 h-3.5 accent-blue-600 rounded" />
                                            <mod.icon size={13} className={on ? 'text-blue-600' : 'text-gray-400'} />
                                            <span className={`text-xs font-medium ${on ? 'text-gray-800' : 'text-gray-500'}`}>{mod.label}</span>
                                        </label>
                                    )
                                })}
                            </div>
                            <p className="text-[9px] text-blue-500 font-bold text-center mt-2">
                                {permissions.modules.length}/{CORPORATE_MODULES.length} seleccionados
                            </p>
                        </div>
                    )}

                    {/* Input + Action */}
                    {mode === 'whatsapp' && (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                    Número de WhatsApp
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+</span>
                                    <input type="tel" required value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-300"
                                        placeholder="56912345678" />
                                </div>
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 p-2.5 rounded-lg font-medium">{error}</p>}
                            {success && <div className="text-green-700 text-xs bg-green-50 p-2.5 rounded-lg font-medium flex items-center gap-1.5"><Check size={14} />{success}</div>}
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition text-sm">Cancelar</button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm">
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                                    Enviar
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'email' && (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Correo electrónico</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                                    placeholder="usuario@ejemplo.com" />
                            </div>
                            {error && <p className="text-red-600 text-xs bg-red-50 p-2.5 rounded-lg font-medium">{error}</p>}
                            {success && <div className="text-green-700 text-xs bg-green-50 p-2.5 rounded-lg font-medium flex items-center gap-1.5"><Check size={14} />{success}</div>}
                            <div className="flex gap-2">
                                <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition text-sm">Cancelar</button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 bg-black text-white py-2.5 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm">
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                                    Enviar
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'link' && (
                        <div className="space-y-3">
                            {inviteLink ? (
                                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl space-y-2.5">
                                    <div className="text-xs text-blue-600 break-all font-mono bg-white p-2.5 rounded-lg border border-blue-100">{inviteLink}</div>
                                    <button onClick={copyToClipboard}
                                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-1.5">
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                        {copied ? 'Copiado!' : 'Copiar Enlace'}
                                    </button>
                                    <p className="text-[9px] text-blue-400 text-center">Válido 7 días • {roleLabels[role]}</p>
                                </div>
                            ) : (
                                <>
                                    {error && <p className="text-red-600 text-xs bg-red-50 p-2.5 rounded-lg font-medium">{error}</p>}
                                    <button onClick={() => handleSubmit()} disabled={loading}
                                        className="w-full bg-black text-white py-2.5 rounded-lg font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm">
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                                        Generar Enlace
                                    </button>
                                </>
                            )}
                            <button type="button" onClick={onClose} className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition text-sm">Cerrar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
