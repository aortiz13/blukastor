'use client'

import { useState, useEffect } from 'react'
import {
    UserPlus, Loader2, XCircle, Mail, Link2, Copy, Check, Shield,
    Bot, DollarSign, MessageSquare, BarChart3, ChevronDown
} from 'lucide-react'

interface InviteUserModalProps {
    companyName: string
}

interface AgentOption {
    agent_type: string
    agent_name: string
}

interface MemberPermissions {
    agents: string[]
    view_finance: boolean
    view_conversations: boolean
    view_kpis: boolean
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

    // Permissions state (for member role)
    const [permissions, setPermissions] = useState<MemberPermissions>({
        agents: [],
        view_finance: false,
        view_conversations: false,
        view_kpis: false,
    })

    // Available agents
    const [availableAgents, setAvailableAgents] = useState<AgentOption[]>([])
    const [loadingAgents, setLoadingAgents] = useState(false)

    // Fetch agents when role changes to member
    useEffect(() => {
        if (role === 'member') {
            fetchAgents()
        }
    }, [role])

    const fetchAgents = async () => {
        setLoadingAgents(true)
        try {
            const res = await fetch('/api/corporate/company-agents')
            const data = await res.json()
            if (data.agents) {
                setAvailableAgents(data.agents)
            }
        } catch (err) {
            console.error('Error fetching agents:', err)
        } finally {
            setLoadingAgents(false)
        }
    }

    const toggleAgent = (agentType: string) => {
        setPermissions(prev => ({
            ...prev,
            agents: prev.agents.includes(agentType)
                ? prev.agents.filter(a => a !== agentType)
                : [...prev.agents, agentType],
        }))
    }

    const togglePermission = (key: 'view_finance' | 'view_conversations' | 'view_kpis') => {
        setPermissions(prev => ({
            ...prev,
            [key]: !prev[key],
        }))
    }

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
                    ...(role === 'member' ? { permissions } : {}),
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
        member: 'Acceso restringido — configura los permisos específicos abajo',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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

                {/* Role Selector */}
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
                        <option value="member">Miembro (Empleado)</option>
                        <option value="admin">Administrador</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1.5 pl-1">
                        {roleDescriptions[role]}
                    </p>
                </div>

                {/* Conditional Permissions Panel (Member only) */}
                {role === 'member' && (
                    <div className="mb-5 space-y-4 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100/50"
                         style={{ animation: 'slideDown 0.3s ease-out' }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Shield size={12} className="text-blue-600" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-800">Configurar Permisos</h3>
                        </div>

                        {/* Agents Section */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                <Bot size={10} className="inline mr-1" />
                                Agentes Virtuales
                            </label>
                            {loadingAgents ? (
                                <div className="flex items-center gap-2 text-gray-400 text-xs py-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    Cargando agentes...
                                </div>
                            ) : availableAgents.length === 0 ? (
                                <p className="text-xs text-gray-400 py-2">No hay agentes activos en esta empresa</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {availableAgents.map((agent) => (
                                        <label
                                            key={agent.agent_type}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                                                permissions.agents.includes(agent.agent_type)
                                                    ? 'bg-white shadow-sm border border-blue-200'
                                                    : 'hover:bg-white/50 border border-transparent'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={permissions.agents.includes(agent.agent_type)}
                                                onChange={() => toggleAgent(agent.agent_type)}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 accent-blue-600"
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Bot size={14} className="text-blue-600" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">{agent.agent_name}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-blue-100/80" />

                        {/* Module Access */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                Acceso a Módulos
                            </label>
                            <div className="space-y-1.5">
                                {/* Finance */}
                                <label className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                                    permissions.view_finance
                                        ? 'bg-white shadow-sm border border-green-200'
                                        : 'hover:bg-white/50 border border-transparent'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={permissions.view_finance}
                                        onChange={() => togglePermission('view_finance')}
                                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 accent-green-600"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                                            <DollarSign size={14} className="text-green-600" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">Finanzas Globales</span>
                                            <p className="text-[10px] text-gray-400">Facturación y datos financieros</p>
                                        </div>
                                    </div>
                                </label>

                                {/* Conversations */}
                                <label className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                                    permissions.view_conversations
                                        ? 'bg-white shadow-sm border border-purple-200'
                                        : 'hover:bg-white/50 border border-transparent'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={permissions.view_conversations}
                                        onChange={() => togglePermission('view_conversations')}
                                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 accent-purple-600"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <MessageSquare size={14} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">Conversaciones</span>
                                            <p className="text-[10px] text-gray-400">Chats de clientes y soporte</p>
                                        </div>
                                    </div>
                                </label>

                                {/* KPIs */}
                                <label className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                                    permissions.view_kpis
                                        ? 'bg-white shadow-sm border border-amber-200'
                                        : 'hover:bg-white/50 border border-transparent'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={permissions.view_kpis}
                                        onChange={() => togglePermission('view_kpis')}
                                        className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 accent-amber-600"
                                    />
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                                            <BarChart3 size={14} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">KPIs</span>
                                            <p className="text-[10px] text-gray-400">Métricas y rendimiento del portal</p>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

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
                                    Válido por 7 días • Rol: {role === 'admin' ? 'Administrador' : 'Miembro'}
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

            {/* Slide animation keyframe */}
            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        max-height: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        max-height: 800px;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    )
}
