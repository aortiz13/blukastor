'use client'

import { useState } from 'react'
import { UserPlus, Loader2, XCircle, Mail, Link2, Copy, Check, Shield } from 'lucide-react'

interface InviteUserModalProps {
    companyName: string
}

export function InviteUserButton({ companyName }: InviteUserModalProps) {
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

            {isOpen && (
                <InviteModal
                    companyName={companyName}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    )
}

function InviteModal({ companyName, onClose }: { companyName: string; onClose: () => void }) {
    const [mode, setMode] = useState<'email' | 'link'>('email')
    const [email, setEmail] = useState('')
    const [role, setRole] = useState('member')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [inviteLink, setInviteLink] = useState('')
    const [copied, setCopied] = useState(false)

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        setInviteLink('')

        try {
            const res = await fetch('/api/corporate/invite-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: mode === 'email' ? email : undefined,
                    role,
                    channel: mode,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error al crear la invitación')
                return
            }

            if (mode === 'email') {
                setSuccess(`Invitación enviada a ${email}`)
                setEmail('')
            } else {
                setInviteLink(data.inviteUrl)
            }
        } catch (err: any) {
            setError(err.message || 'Error de red')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const roleDescriptions: Record<string, string> = {
        admin: 'Gestión completa de usuarios y configuración del portal',
        member: 'Acceso estándar a todas las funciones del portal',
        viewer: 'Solo lectura, sin capacidad de edición',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-start mb-1">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Invitar Usuario</h2>
                        <p className="text-gray-400 text-sm mt-0.5">{companyName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition p-1">
                        <XCircle size={22} />
                    </button>
                </div>

                {/* Tab Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-xl mt-5 mb-6">
                    <button
                        onClick={() => { setMode('email'); setError(''); setSuccess(''); setInviteLink('') }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${mode === 'email' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Mail size={14} />
                        Email
                    </button>
                    <button
                        onClick={() => { setMode('link'); setError(''); setSuccess(''); setInviteLink('') }}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${mode === 'link' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Link2 size={14} />
                        Enlace
                    </button>
                </div>

                {/* Role Selector (shared) */}
                <div className="mb-5">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                        <Shield size={12} className="inline mr-1" />
                        Rol en el portal
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                    >
                        <option value="member">Miembro</option>
                        <option value="admin">Administrador</option>
                        <option value="viewer">Viewer (Solo lectura)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1.5 pl-1">
                        {roleDescriptions[role]}
                    </p>
                </div>

                {/* Email Mode */}
                {mode === 'email' && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Correo electrónico
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
                                placeholder="usuario@ejemplo.com"
                            />
                        </div>

                        {error && (
                            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</p>
                        )}
                        {success && (
                            <div className="text-green-700 text-sm bg-green-50 p-3 rounded-xl font-medium flex items-center gap-2">
                                <Check size={16} />
                                {success}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                                Enviar
                            </button>
                        </div>
                    </form>
                )}

                {/* Link Mode */}
                {mode === 'link' && (
                    <div className="space-y-4">
                        {inviteLink ? (
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-3">
                                <p className="text-xs font-bold text-blue-800 uppercase tracking-widest">
                                    Enlace generado
                                </p>
                                <div className="text-xs text-blue-600 break-all font-mono bg-white p-3 rounded-lg border border-blue-100 leading-relaxed">
                                    {inviteLink}
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                    {copied ? 'Copiado!' : 'Copiar Enlace'}
                                </button>
                                <p className="text-[10px] text-blue-400 text-center">
                                    Válido por 7 días • Rol: {role}
                                </p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</p>
                                )}
                                <button
                                    onClick={() => handleSubmit()}
                                    disabled={loading}
                                    className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                                    Generar Enlace de Invitación
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition text-sm"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
