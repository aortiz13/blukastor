'use client'

import { useState } from 'react'
import { Loader2, RotateCcw, Save, Bot, Sparkles, Users, MessageSquare, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface Agent {
    id: string
    agent_type: string
    agent_name: string
    personality_traits: Record<string, string> | null
    target_audience: string | null
}

interface AgentConfigFormProps {
    agents: Agent[]
    canEdit: boolean
    companyId: string
}

const AGENT_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string; border: string; iconBg: string }> = {
    onboarding: {
        label: 'Onboarding',
        icon: <Sparkles className="w-4 h-4" />,
        color: 'text-amber-600',
        border: 'border-l-amber-400',
        iconBg: 'bg-amber-100',
    },
    business: {
        label: 'Negocios',
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-blue-600',
        border: 'border-l-blue-400',
        iconBg: 'bg-blue-100',
    },
    finance: {
        label: 'Finanzas',
        icon: <Bot className="w-4 h-4" />,
        color: 'text-emerald-600',
        border: 'border-l-emerald-400',
        iconBg: 'bg-emerald-100',
    },
    goals: {
        label: 'Metas',
        icon: <Users className="w-4 h-4" />,
        color: 'text-purple-600',
        border: 'border-l-purple-400',
        iconBg: 'bg-purple-100',
    },
}

const DEFAULT_META = {
    label: 'Agente',
    icon: <Bot className="w-4 h-4" />,
    color: 'text-gray-600',
    border: 'border-l-gray-400',
    iconBg: 'bg-gray-100',
}

function getAgentMeta(agentType: string) {
    if (AGENT_TYPE_META[agentType]) return AGENT_TYPE_META[agentType]
    for (const [key, meta] of Object.entries(AGENT_TYPE_META)) {
        if (agentType.includes(key)) return meta
    }
    return DEFAULT_META
}

function personalityToText(traits: Record<string, string> | null): string {
    if (!traits || Object.keys(traits).length === 0) return ''
    return Object.entries(traits)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ')
}

function textToPersonality(text: string): Record<string, string> | null {
    if (!text.trim()) return null
    const result: Record<string, string> = {}
    text.split(',').forEach(pair => {
        const [key, ...valParts] = pair.split(':')
        if (key && valParts.length > 0) {
            result[key.trim()] = valParts.join(':').trim()
        }
    })
    return Object.keys(result).length > 0 ? result : null
}

export function AgentConfigForm({ agents, canEdit, companyId }: AgentConfigFormProps) {
    // Global audience — take from first agent or default
    const initialAudience = agents.length > 0
        ? (agents[0].target_audience || 'general')
        : 'general'
    const [globalAudience, setGlobalAudience] = useState(initialAudience)
    const [savingAudience, setSavingAudience] = useState(false)

    const handleSaveAudience = async () => {
        setSavingAudience(true)
        try {
            // Save audience to ALL agents
            const results = await Promise.all(
                agents.map(agent =>
                    fetch('/api/corporate/agents', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agent_id: agent.id,
                            target_audience: globalAudience,
                        }),
                    })
                )
            )

            const failed = results.filter(r => !r.ok)
            if (failed.length > 0) throw new Error(`${failed.length} agentes fallaron al actualizar`)

            toast.success('Audiencia actualizada', {
                description: `"${globalAudience || 'general'}" aplicada a ${agents.length} agentes`,
            })
        } catch (err: any) {
            toast.error('Error al guardar audiencia', { description: err.message })
        } finally {
            setSavingAudience(false)
        }
    }

    return (
        <div className="space-y-5">
            {/* Defaults Info — compact */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-xl">
                <Bot className="w-4 h-4 text-violet-500 shrink-0" />
                <p className="text-xs text-violet-700">
                    <strong>Valores por Defecto:</strong> Nombre &quot;Nova&quot; · Personalidad genérica · Audiencia &quot;general&quot;
                </p>
            </div>

            {/* Global Audience Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                        <Globe className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-gray-900">Audiencia / Cliente Ideal</h3>
                        <p className="text-[11px] text-gray-400">Se aplica a todos los agentes de tu empresa</p>
                    </div>
                </div>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <input
                            type="text"
                            value={globalAudience}
                            onChange={(e) => setGlobalAudience(e.target.value)}
                            disabled={!canEdit}
                            maxLength={200}
                            placeholder="Ej: niños, deportistas, familias, profesionales de TI..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition-all text-sm"
                        />
                    </div>
                    {canEdit && (
                        <button
                            onClick={handleSaveAudience}
                            disabled={savingAudience}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs shadow-sm hover:shadow shrink-0"
                        >
                            {savingAudience ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            Guardar Audiencia
                        </button>
                    )}
                </div>
            </div>

            {/* Agent Cards */}
            {agents.length === 0 ? (
                <div className="text-center py-12">
                    <Bot className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium text-sm">No se encontraron agentes activos.</p>
                    <p className="text-gray-400 text-xs mt-1">Contacta al equipo de Blukastor para activar agentes.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {agents.map(agent => (
                        <AgentCard
                            key={agent.id}
                            agent={agent}
                            canEdit={canEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function AgentCard({ agent, canEdit }: { agent: Agent; canEdit: boolean }) {
    const meta = getAgentMeta(agent.agent_type)
    const [agentName, setAgentName] = useState(agent.agent_name || 'Nova')
    const [personalityText, setPersonalityText] = useState(personalityToText(agent.personality_traits))
    const [saving, setSaving] = useState(false)

    const isCustomized = agentName !== 'Nova' || personalityText !== ''

    const handleSave = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/corporate/agents', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent_id: agent.id,
                    agent_name: agentName,
                    personality_traits: textToPersonality(personalityText),
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            toast.success(`${meta.label} actualizado`, {
                description: `Nombre: ${agentName}`,
            })
        } catch (err: any) {
            toast.error('Error al guardar', { description: err.message })
        } finally {
            setSaving(false)
        }
    }

    const handleRestore = () => {
        setAgentName('Nova')
        setPersonalityText('')
        toast.info('Valores restaurados a default', {
            description: 'Presiona "Guardar" para confirmar.',
        })
    }

    return (
        <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${meta.border} overflow-hidden hover:shadow-md transition-all duration-200`}>
            {/* Compact Header */}
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${meta.iconBg} ${meta.color}`}>
                        {meta.icon}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-gray-900 leading-none">{meta.label}</h3>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{agent.agent_type}</p>
                    </div>
                </div>
                {isCustomized ? (
                    <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold border border-green-100">
                        Personalizado
                    </span>
                ) : (
                    <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full text-[10px] font-bold border border-gray-100">
                        Default
                    </span>
                )}
            </div>

            {/* Compact Form — only Name + Personality */}
            <div className="px-4 pb-4 space-y-3">
                <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Nombre del Agente</label>
                    <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        disabled={!canEdit}
                        maxLength={50}
                        placeholder="Nova"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 transition-all text-sm"
                    />
                </div>

                <div>
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">Personalidad</label>
                    <textarea
                        value={personalityText}
                        onChange={(e) => setPersonalityText(e.target.value)}
                        disabled={!canEdit}
                        maxLength={500}
                        rows={2}
                        placeholder="tono: cálido, brevedad: alto, formalidad: media"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-400 transition-all text-sm"
                    />
                </div>

                {/* Actions */}
                {canEdit && (
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-violet-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs shadow-sm hover:shadow"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Guardar
                        </button>
                        <button
                            onClick={handleRestore}
                            disabled={saving}
                            className="px-4 py-2 border border-gray-200 rounded-lg font-semibold text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Default
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
