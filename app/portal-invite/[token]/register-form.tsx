'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, UserPlus, Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, LogIn } from 'lucide-react'

interface InviteRegisterFormProps {
    token: string
    companyName: string
    role: string
    inviteEmail?: string | null
}

export default function InviteRegisterForm({ token, companyName, role, inviteEmail }: InviteRegisterFormProps) {
    const [email, setEmail] = useState(inviteEmail || '')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [mode, setMode] = useState<'register' | 'login'>('register')
    const supabase = createClient()

    const roleLabels: Record<string, string> = {
        admin: 'Administrador',
        member: 'Miembro del equipo',
        client: 'Cliente',
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        setLoading(true)

        try {
            // 1. Create user via server API (bypasses email hook)
            const res = await fetch('/api/corporate/invite-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, token }),
            })
            const data = await res.json()

            if (!res.ok) {
                if (data.existing) {
                    // User already exists — switch to login mode automatically
                    setMode('login')
                    setConfirmPassword('')
                    setError('Este correo ya tiene una cuenta. Ingresa tu contraseña para continuar.')
                } else {
                    setError(data.error || 'Error al crear la cuenta')
                }
                setLoading(false)
                return
            }

            // 2. Log in with the new credentials
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (loginError) {
                setError('Cuenta creada, pero error al iniciar sesión: ' + loginError.message)
                setLoading(false)
                return
            }

            // 3. Redirect to accept the invite
            window.location.href = `/portal-invite/${token}`
        } catch (err: any) {
            setError(err.message || 'Error al registrar')
        } finally {
            setLoading(false)
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (loginError) {
                setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
                setLoading(false)
                return
            }

            window.location.href = `/portal-invite/${token}`
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión')
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-xl text-center space-y-5">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} className="text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">¡Cuenta creada!</h1>
                    <p className="text-gray-500 text-sm">
                        Revisa tu correo electrónico <span className="font-medium text-gray-700">{email}</span> para confirmar tu cuenta.
                        Después de confirmar, podrás acceder al portal.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-200">
                        {mode === 'register' ? <UserPlus size={24} className="text-white" /> : <LogIn size={24} className="text-white" />}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Únete a {companyName}</h1>
                    <p className="text-gray-400 text-sm">
                        Has sido invitado como <span className="font-semibold text-gray-600">{roleLabels[role] || role}</span>
                    </p>
                    {mode === 'login' && (
                        <p className="text-blue-600 text-xs font-medium bg-blue-50 rounded-lg px-3 py-2 mt-2">
                            Ya tienes una cuenta. Inicia sesión para aceptar la invitación.
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            Correo electrónico
                        </label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                                placeholder="tu@correo.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            Contraseña
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                                placeholder={mode === 'login' ? 'Tu contraseña actual' : 'Mínimo 6 caracteres'}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {mode === 'register' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                                Confirmar contraseña
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={6}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
                                    placeholder="Repite tu contraseña"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className={`text-sm p-3 rounded-xl font-medium ${mode === 'login' && error.includes('ya tiene') ? 'text-blue-700 bg-blue-50' : 'text-red-600 bg-red-50'}`}>{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-200"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                        {mode === 'register' ? 'Crear Cuenta y Acceder' : 'Iniciar Sesión y Aceptar Invitación'}
                    </button>
                </form>

                {/* Toggle mode */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-white px-3 text-gray-400 font-bold">
                            {mode === 'register' ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setMode(mode === 'register' ? 'login' : 'register')
                        setError('')
                        setConfirmPassword('')
                    }}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition text-sm"
                >
                    {mode === 'register' ? 'Iniciar Sesión con cuenta existente' : 'Crear una cuenta nueva'}
                </button>
            </div>
        </div>
    )
}
