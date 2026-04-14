'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Loader2, Mail, Lock, ArrowRight } from 'lucide-react'

interface CompanyBranding {
    companyId?: string
    found: boolean
    name?: string
    logo_url?: string
    logo_dark_url?: string
    logo_icon_url?: string
    primary_color?: string
    secondary_color?: string
    cover_image_url?: string
    tagline?: string
    login_background_url?: string
    login_welcome_text?: string
}

export default function CorporateLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('info')
    const [branding, setBranding] = useState<CompanyBranding | null>(null)
    const [forgotMode, setForgotMode] = useState(false)
    const supabase = createClient()

    // Detect custom domain and fetch branding
    useEffect(() => {
        const hostname = window.location.hostname
        // Skip for localhost and default domains
        if (hostname === 'localhost' || hostname.includes('vercel') || hostname.includes('blukastor')) {
            return
        }

        // Custom domain detected — fetch branding
        fetch(`/api/corporate/branding?domain=${encodeURIComponent(hostname)}`)
            .then(res => res.json())
            .then(data => {
                if (data.found) {
                    setBranding(data)
                }
            })
            .catch(err => console.error('Failed to fetch branding:', err))
    }, [])

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setIsLoading(false)
            setMessage(error.message)
            setMessageType('error')
            return
        }

        // Verify corporate admin access
        const { data: adminProfile, error: profileError } = await supabase
            .from('admin_profiles')
            .select('auth_user_id')
            .eq('auth_user_id', data.user.id)
            .limit(1)

        if (profileError || !adminProfile || adminProfile.length === 0) {
            // Sign out the user — they don't have corporate access
            await supabase.auth.signOut()
            setIsLoading(false)
            setMessage('Tu cuenta no tiene acceso al Portal Corporativo. Contacta al equipo de Blukastor.')
            setMessageType('error')
            return
        }

        // Redirect to corporate dashboard
        window.location.href = '/corporate/dashboard'
    }



    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setMessage('Ingresa tu email primero.')
            setMessageType('error')
            return
        }
        setIsLoading(true)
        setMessage('')

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, companyId: branding?.companyId }),
            })
            const data = await res.json()

            if (!res.ok) {
                setMessage(data.error || 'Error al enviar el correo')
                setMessageType('error')
            } else {
                setMessage(data.message)
                setMessageType('success')
            }
        } catch (err: any) {
            setMessage(err.message)
            setMessageType('error')
        }
        setIsLoading(false)
    }

    // Resolved branding values
    const companyName = branding?.name
    const logoUrl = branding?.logo_url || branding?.logo_dark_url
    const primaryColor = branding?.primary_color || '#6366f1'
    const secondaryColor = branding?.secondary_color || '#8b5cf6'
    const loginBgUrl = branding?.login_background_url || branding?.cover_image_url
    const welcomeText = branding?.login_welcome_text || branding?.tagline
    const loginTitle = companyName ? `Portal ${companyName}` : 'Portal Corporativo'
    const loginSubtitle = forgotMode ? 'Recupera tu acceso' : (welcomeText || 'Acceso exclusivo para clientes corporativos')

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            {loginBgUrl ? (
                <>
                    <div className="absolute inset-0">
                        <img src={loginBgUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                </>
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />
            )}

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${primaryColor}15` }} />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: `${secondaryColor}15` }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl" style={{ backgroundColor: `${primaryColor}08` }} />
                {/* Grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                    }}
                />
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md mx-4">
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    {logoUrl ? (
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm shadow-lg mb-5 p-2 border border-white/10">
                            <img
                                src={logoUrl}
                                alt={companyName || 'Logo'}
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                    ) : (
                        <div
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-5"
                            style={{
                                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                boxShadow: `0 10px 25px -5px ${primaryColor}40`,
                            }}
                        >
                            <Building2 className="text-white" size={30} />
                        </div>
                    )}
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        {loginTitle}
                    </h1>
                    <p className="mt-2 text-indigo-200/70 text-sm">
                        {loginSubtitle}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    {forgotMode ? (
                        /* Forgot Password Mode */
                        <form onSubmit={handleForgotPassword} className="space-y-5">
                            {/* Email Input */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={18} className="text-indigo-300/50" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email corporativo"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <p className="text-indigo-200/40 text-xs text-center">
                                Te enviaremos un enlace para restablecer tu contraseña
                            </p>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                style={{
                                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                    boxShadow: `0 10px 25px -5px ${primaryColor}40`,
                                }}
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    'Enviar enlace de recuperación'
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setForgotMode(false); setMessage('') }}
                                className="w-full text-center text-sm text-indigo-300/50 hover:text-indigo-300/80 transition-colors font-medium"
                            >
                                ← Volver al inicio de sesión
                            </button>
                        </form>
                    ) : (
                        /* Normal Login Mode */
                        <>
                            <form onSubmit={handlePasswordLogin} className="space-y-5">
                                {/* Email Input */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail size={18} className="text-indigo-300/50" />
                                    </div>
                                    <input
                                        type="email"
                                        placeholder="Email corporativo"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>

                                {/* Password Input */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-indigo-300/50" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>

                                {/* Forgot Password Link */}
                                <div className="flex justify-end -mt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setForgotMode(true); setMessage('') }}
                                        className="text-xs text-indigo-300/50 hover:text-indigo-300/80 transition-colors font-medium"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    style={{
                                        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                        boxShadow: `0 10px 25px -5px ${primaryColor}40`,
                                    }}
                                >
                                    {isLoading ? (
                                        <Loader2 className="animate-spin" size={20} />
                                    ) : (
                                        <>
                                            Ingresar al Portal
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    {/* Message */}
                    {message && (
                        <div className={`mt-5 p-3 rounded-xl text-sm text-center font-medium ${messageType === 'error'
                            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                            : messageType === 'success'
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                            }`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Footer link */}
                <div className="text-center mt-6">
                    <a
                        href="/login"
                        className="text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                        ¿Eres administrador del sistema? →
                    </a>
                </div>
            </div>
        </div>
    )
}
