'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import {
    User, Mail, MapPin, Briefcase, Sparkles, Loader2,
    Building2, FileText, Save, CheckCircle2, Pencil
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileData {
    real_name?: string
    nickname?: string
    email?: string
    country?: string
    city?: string
    job_title?: string
    industry?: string
    bio?: string
}

const PROFILE_FIELDS: { key: keyof ProfileData; label: string; icon: any; placeholder: string; colSpan?: boolean }[] = [
    { key: 'real_name', label: 'Nombre Completo', icon: User, placeholder: 'Ej: Juan Pérez' },
    { key: 'nickname', label: 'Apodo / Nombre Preferido', icon: User, placeholder: '¿Cómo prefieres que te llamen?' },
    { key: 'email', label: 'Correo Electrónico', icon: Mail, placeholder: 'tu@correo.com' },
    { key: 'job_title', label: 'Puesto / Rol', icon: Briefcase, placeholder: 'Ej: CEO, Gerente de Ventas...' },
    { key: 'industry', label: 'Industria', icon: Building2, placeholder: 'Ej: Inmobiliaria, Tecnología...' },
    { key: 'country', label: 'País', icon: MapPin, placeholder: 'Ej: México, Chile...' },
    { key: 'city', label: 'Ciudad', icon: MapPin, placeholder: 'Ej: CDMX, Santiago...' },
    { key: 'bio', label: 'Acerca de mí', icon: FileText, placeholder: 'Una breve descripción sobre ti...', colSpan: true },
]

export function ProfileForm({ contactId, companyId }: { contactId: string; companyId: string }) {
    const [profile, setProfile] = useState<ProfileData>({})
    const [originalProfile, setOriginalProfile] = useState<ProfileData>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [completion, setCompletion] = useState(0)
    const supabase = createClient()

    const fetchProfile = useCallback(async () => {
        try {
            const res = await fetch(`/api/profile?contact_id=${contactId}`)
            if (res.ok) {
                const data = await res.json()
                setProfile(data.profile || {})
                setOriginalProfile(data.profile || {})
                setCompletion(data.completion || 0)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
        }
        setIsLoading(false)
    }, [contactId])

    useEffect(() => {
        fetchProfile()

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`profile_sync_${contactId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_context',
                    filter: `contact_id=eq.${contactId}`,
                },
                (payload) => {
                    if (payload.new && (payload.new as any).profile) {
                        const newProfile = (payload.new as any).profile as ProfileData
                        setProfile((prev) => ({ ...prev, ...newProfile }))
                        setOriginalProfile((prev) => ({ ...prev, ...newProfile }))
                        setCompletion((payload.new as any).profile_completion_percent || 0)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [contactId, fetchProfile, supabase])

    const handleFieldChange = (key: keyof ProfileData, value: string) => {
        setProfile((prev) => ({ ...prev, [key]: value }))
        setSaved(false)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact_id: contactId, profile }),
            })
            const data = await res.json()
            if (res.ok) {
                setOriginalProfile(profile)
                setCompletion(data.completion || 0)
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (err) {
            console.error('Error saving profile:', err)
        }
        setIsSaving(false)
    }

    const hasChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile)

    // Calculate filled fields for progress
    const filledCount = PROFILE_FIELDS.filter(
        (f) => profile[f.key] && String(profile[f.key]).trim().length > 0
    ).length
    const totalFields = PROFILE_FIELDS.length

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-16">
                <Loader2 className="animate-spin text-violet-500" size={32} />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg shadow-violet-200">
                            <User className="text-white" size={20} />
                        </div>
                        Mi Perfil
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Completa tu información personal. También se actualiza automáticamente al conversar con el agente.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium animate-in fade-in">
                            <CheckCircle2 size={16} />
                            Guardado
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                        className={cn(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
                            hasChanges
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-[1.02]'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Guardar
                    </button>
                </div>
            </div>

            {/* Completion Bar */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Perfil completado</span>
                    <span className={cn(
                        'text-sm font-bold',
                        filledCount === totalFields ? 'text-emerald-600' : 'text-violet-600'
                    )}>
                        {filledCount}/{totalFields} campos
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-700',
                            filledCount === totalFields
                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                : 'bg-gradient-to-r from-violet-500 to-indigo-500'
                        )}
                        style={{ width: `${(filledCount / totalFields) * 100}%` }}
                    />
                </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROFILE_FIELDS.map(({ key, label, icon: Icon, placeholder, colSpan }) => (
                    <div key={key} className={cn('space-y-1.5', colSpan && 'md:col-span-2')}>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                            {label}
                        </label>
                        <div className="relative group">
                            <Icon
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-violet-500 transition-colors"
                            />
                            {key === 'bio' ? (
                                <textarea
                                    rows={3}
                                    value={profile[key] || ''}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all resize-none"
                                />
                            ) : (
                                <input
                                    type={key === 'email' ? 'email' : 'text'}
                                    value={profile[key] || ''}
                                    onChange={(e) => handleFieldChange(key, e.target.value)}
                                    placeholder={placeholder}
                                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 transition-all"
                                />
                            )}
                            {profile[key] && profile[key] !== originalProfile[key] && (
                                <Pencil size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-400" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* AI Auto-fill hint */}
            <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 flex gap-4 items-start">
                <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                    <Sparkles className="text-violet-500" size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-violet-700 text-sm">Autocompletado Inteligente</h4>
                    <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                        Tu perfil también se actualiza automáticamente cuando conversas con el agente virtual.
                        Los campos se llenarán con la información que compartas durante tus chats.
                    </p>
                </div>
            </div>
        </div>
    )
}
