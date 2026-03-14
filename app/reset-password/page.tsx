'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)
    const supabase = createClient()

    // Supabase injects the recovery session via the URL hash fragment.
    // The client SDK picks it up automatically via onAuthStateChange.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                    setSessionReady(true)
                    setCheckingSession(false)
                }
            }
        )

        // Also check if user is already signed in (e.g. they arrived via code exchange)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true)
            }
            setCheckingSession(false)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        setIsLoading(true)
        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            })

            if (updateError) {
                if (updateError.message.includes('same')) {
                    setError('La nueva contraseña debe ser diferente a la actual')
                } else {
                    setError(updateError.message)
                }
            } else {
                setSuccess(true)
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado')
        }
        setIsLoading(false)
    }

    // Loading state
    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        )
    }

    // No session — invalid or expired link
    if (!sessionReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4">
                <div className="w-full max-w-md text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto">
                        <ShieldCheck className="text-red-400" size={30} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Enlace inválido o expirado</h1>
                    <p className="text-indigo-200/60 text-sm">
                        El enlace de recuperación ha expirado o ya fue utilizado. Solicita uno nuevo desde el inicio de sesión.
                    </p>
                    <a
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        Volver al inicio de sesión
                    </a>
                </div>
            </div>
        )
    }

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4">
                <div className="w-full max-w-md text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto">
                        <CheckCircle2 className="text-emerald-400" size={30} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">¡Contraseña actualizada!</h1>
                    <p className="text-indigo-200/60 text-sm">
                        Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                    </p>
                    <a
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
                    >
                        Ir al inicio de sesión
                    </a>
                </div>
            </div>
        )
    }

    // Reset form
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-4">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20 mb-5">
                        <ShieldCheck className="text-white" size={30} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        Nueva Contraseña
                    </h1>
                    <p className="mt-2 text-indigo-200/60 text-sm">
                        Ingresa tu nueva contraseña para restablecer tu acceso
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* New Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-indigo-200/50 uppercase tracking-wider">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => { setNewPassword(e.target.value); setError('') }}
                                    placeholder="Mínimo 6 caracteres"
                                    minLength={6}
                                    required
                                    className="w-full pl-12 pr-12 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300/40 hover:text-indigo-300/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-indigo-200/50 uppercase tracking-wider">
                                Confirmar Contraseña
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                                    placeholder="Repite tu nueva contraseña"
                                    minLength={6}
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/[0.06] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 rounded-xl text-sm text-center font-medium bg-red-500/10 text-red-300 border border-red-500/20">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !newPassword || !confirmPassword}
                            className="w-full flex items-center justify-center gap-2 py-3.5 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <ShieldCheck size={18} />
                                    Restablecer Contraseña
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Back link */}
                <div className="text-center mt-6">
                    <a
                        href="/login"
                        className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                        <ArrowLeft size={14} />
                        Volver al inicio de sesión
                    </a>
                </div>
            </div>
        </div>
    )
}
