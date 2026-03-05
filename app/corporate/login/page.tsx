'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Loader2, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'

export default function CorporateLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState<'error' | 'success' | 'info'>('info')
    const supabase = createClient()

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
            .select('id')
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

    const handleMagicLink = async () => {
        if (!email) {
            setMessage('Ingresa tu email primero.')
            setMessageType('error')
            return
        }

        setIsMagicLinkLoading(true)
        setMessage('')

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback?next=/corporate/dashboard`,
            },
        })

        setIsMagicLinkLoading(false)
        if (error) {
            setMessage(error.message)
            setMessageType('error')
        } else {
            setMessage('Revisa tu correo electrónico. Te enviamos un enlace de acceso.')
            setMessageType('success')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />

            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl" />
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
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 mb-5">
                        <Building2 className="text-white" size={30} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        Portal Corporativo
                    </h1>
                    <p className="mt-2 text-indigo-200/70 text-sm">
                        Acceso exclusivo para clientes corporativos
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-transparent px-3 text-white/30 tracking-wider">o también</span>
                        </div>
                    </div>

                    {/* Magic Link Button */}
                    <button
                        onClick={handleMagicLink}
                        disabled={isMagicLinkLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white rounded-xl transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isMagicLinkLoading ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <>
                                <Sparkles size={16} className="text-indigo-400" />
                                Enviar Magic Link
                            </>
                        )}
                    </button>

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
