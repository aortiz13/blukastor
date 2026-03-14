'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCompanyByDomain } from '@/lib/data/companies'
import { Loader2, Mail, Phone, MessageCircle, UserPlus } from 'lucide-react'
import { useParams } from 'next/navigation'

export default function LoginPage() {
    const params = useParams()
    const rawDomain = params?.domain as string
    const domain = decodeURIComponent(rawDomain || '')

    const [company, setCompany] = useState<any>(null)
    const [loadingCompany, setLoadingCompany] = useState(true)
    const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')

    // Email state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Phone state
    const [phone, setPhone] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [otpSent, setOtpSent] = useState(false)
    const [contactName, setContactName] = useState('')

    // Registration state (when hasUser: false)
    const [needsRegistration, setNeedsRegistration] = useState(false)
    const [regEmail, setRegEmail] = useState('')
    const [regPassword, setRegPassword] = useState('')
    const [regContactId, setRegContactId] = useState('')

    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [forgotMode, setForgotMode] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        if (domain) {
            getCompanyByDomain(supabase, domain)
                .then(setCompany)
                .finally(() => setLoadingCompany(false))
        }
    }, [domain])

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        setIsLoading(false)
        if (error) {
            setMessage('Error: ' + error.message)
        } else {
            setMessage('¡Revisa tu email para entrar!')
        }
    }

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setIsLoading(false)
        if (error) {
            setMessage('Error: ' + error.message)
        } else {
            window.location.href = '/'
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setMessage('Error: Ingresa tu correo electrónico primero')
            return
        }
        setIsLoading(true)
        setMessage('')

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const data = await res.json()

            if (!res.ok) {
                setMessage('Error: ' + (data.error || 'Error al enviar el correo'))
            } else {
                setMessage('✅ ' + data.message)
            }
        } catch (err: any) {
            setMessage('Error: ' + err.message)
        }
        setIsLoading(false)
    }

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        try {
            const res = await fetch('/api/auth/phone-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone.startsWith('+') ? phone : `+${phone}`,
                    companyId: company?.id,
                    domain,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setMessage('Error: ' + (data.error || 'Error al enviar código'))
            } else {
                setOtpSent(true)
                setContactName(data.contactName || '')
                setMessage('✅ Código enviado por WhatsApp')
            }
        } catch (err: any) {
            setMessage('Error: ' + err.message)
        }

        setIsLoading(false)
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        try {
            const res = await fetch('/api/auth/phone-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone.startsWith('+') ? phone : `+${phone}`,
                    otp: otpCode,
                    companyId: company?.id,
                    domain,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setMessage('Error: ' + (data.error || 'Código inválido'))
            } else if (data.hasUser && data.tokenHash) {
                // Verify session directly in the browser — no external redirect
                const { error: verifyError } = await supabase.auth.verifyOtp({
                    token_hash: data.tokenHash,
                    type: 'magiclink',
                })
                if (verifyError) {
                    setMessage('Error: ' + verifyError.message)
                } else {
                    window.location.href = '/'
                }
            } else if (!data.hasUser && data.contactId) {
                // No user yet — show registration form
                setRegContactId(data.contactId)
                setNeedsRegistration(true)
                setMessage('')
            } else {
                setMessage(data.message || 'Verificación exitosa')
            }
        } catch (err: any) {
            setMessage('Error: ' + err.message)
        }

        setIsLoading(false)
    }

    const handlePhoneRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage('')

        try {
            const res = await fetch('/api/auth/phone-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: regEmail,
                    password: regPassword,
                    phone: phone.startsWith('+') ? phone : `+${phone}`,
                    contactId: regContactId,
                    companyId: company?.id,
                    domain,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setMessage('Error: ' + (data.error || 'Error al crear cuenta'))
            } else if (data.success) {
                // Account created — sign in directly with the credentials
                setMessage('✅ ¡Cuenta creada! Iniciando sesión...')
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: regEmail,
                    password: regPassword,
                })

                if (signInError) {
                    setMessage('Cuenta creada. Inicia sesión con tu email y contraseña.')
                    setNeedsRegistration(false)
                    setLoginMethod('email')
                    setEmail(regEmail)
                } else {
                    window.location.href = '/'
                }
            }
        } catch (err: any) {
            setMessage('Error: ' + err.message)
        }

        setIsLoading(false)
    }

    // Read branding from top-level company columns (not frontend_config)
    const logoUrl = company?.logo_url || ''
    const primaryColor = company?.primary_color || '#111827'
    const coverImageUrl = company?.cover_image_url || ''
    const coverImageMobileUrl = company?.cover_image_mobile_url || ''
    const companyName = company?.name || 'Portal'
    const fontHeading = company?.font_heading || 'Inter'
    const fontBody = company?.font_body || 'Inter'
    const portalConfig = (company?.frontend_config as any)?.portal || {}
    const welcomeText = portalConfig.login_welcome_text || `Bienvenido al portal de ${companyName}`
    const mobileCover = coverImageMobileUrl || coverImageUrl

    // Google Fonts
    const fontsToLoad = [...new Set([fontHeading, fontBody])]
    const googleFontsUrl = `https://fonts.googleapis.com/css2?${fontsToLoad.map((f: string) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`).join('&')}&display=swap`

    if (loadingCompany) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <>
            <link rel="stylesheet" href={googleFontsUrl} />
            <div
                className="flex flex-col lg:flex-row min-h-screen"
                style={{ fontFamily: `'${fontBody}', sans-serif` }}
            >
                {/* Desktop: Left side — Cover Image */}
                {coverImageUrl && (
                    <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative">
                        <img
                            src={coverImageUrl}
                            alt={companyName}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Mobile: Cover Image Banner */}
                {mobileCover && (
                    <div className="lg:hidden relative w-full h-48 sm:h-56 overflow-hidden">
                        <img
                            src={mobileCover}
                            alt={companyName}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>
                )}

                {/* Right side — Login Form */}
                <div
                    className={`w-full ${coverImageUrl ? 'lg:w-1/2' : ''} flex flex-1 items-center justify-center p-8 lg:p-12 relative ${!coverImageUrl ? 'bg-gray-50' : ''}`}
                    style={{ backgroundColor: company.login_bg_color || '#ffffff' }}
                >
                    <div className="w-full max-w-sm space-y-8">
                        {/* Logo + Header */}
                        <div className="text-center">
                            {logoUrl && (
                                <img
                                    src={logoUrl}
                                    alt={companyName}
                                    className="mx-auto h-14 w-auto mb-6 object-contain"
                                />
                            )}
                            <h1
                                className="text-2xl font-bold text-gray-900"
                                style={{ fontFamily: `'${fontHeading}', sans-serif` }}
                            >
                                {welcomeText}
                            </h1>
                        </div>

                        {/* Method Toggle */}
                        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                            <button
                                onClick={() => { setLoginMethod('email'); setMessage('') }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${loginMethod === 'email'
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-700 bg-white'
                                    }`}
                                style={loginMethod === 'email' ? { backgroundColor: primaryColor } : {}}
                            >
                                <Mail size={16} />
                                Email
                            </button>
                            <button
                                onClick={() => { setLoginMethod('phone'); setMessage('') }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${loginMethod === 'phone'
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-700 bg-white'
                                    }`}
                                style={loginMethod === 'phone' ? { backgroundColor: primaryColor } : {}}
                            >
                                <MessageCircle size={16} />
                                WhatsApp
                            </button>
                        </div>

                        {/* Email Login */}
                        {loginMethod === 'email' && (
                            <>
                                {forgotMode ? (
                                    /* Forgot Password Mode */
                                    <form onSubmit={handleForgotPassword} className="space-y-4">
                                        <div className="space-y-3">
                                            <input
                                                type="email"
                                                required
                                                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:outline-none transition"
                                                style={{ '--tw-ring-color': primaryColor + '40', borderColor: 'rgb(229,231,235)' } as any}
                                                placeholder="Correo electrónico"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 text-center">
                                            Te enviaremos un enlace para restablecer tu contraseña
                                        </p>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isLoading ? <Loader2 className="mr-2 animate-spin" size={18} /> : 'Enviar enlace de recuperación'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setForgotMode(false); setMessage('') }}
                                            className="flex w-full justify-center text-sm font-medium transition"
                                            style={{ color: primaryColor }}
                                        >
                                            ← Volver al inicio de sesión
                                        </button>
                                    </form>
                                ) : (
                                    /* Normal Email Login Mode */
                                    <>
                                        <form onSubmit={handlePasswordLogin} className="space-y-4">
                                            <div className="space-y-3">
                                                <input
                                                    type="email"
                                                    required
                                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:outline-none transition"
                                                    style={{ '--tw-ring-color': primaryColor + '40', borderColor: 'rgb(229,231,235)' } as any}
                                                    placeholder="Correo electrónico"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                                <input
                                                    type="password"
                                                    required
                                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:outline-none transition"
                                                    style={{ '--tw-ring-color': primaryColor + '40' } as any}
                                                    placeholder="Contraseña"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex justify-end -mt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => { setForgotMode(true); setMessage('') }}
                                                    className="text-xs font-medium transition hover:opacity-80"
                                                    style={{ color: primaryColor }}
                                                >
                                                    ¿Olvidaste tu contraseña?
                                                </button>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {isLoading ? <Loader2 className="mr-2 animate-spin" size={18} /> : 'Entrar con Contraseña'}
                                            </button>
                                        </form>

                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                                            <div className="relative flex justify-center text-xs uppercase"><span className="px-3 text-gray-400" style={{ backgroundColor: company.login_bg_color || '#ffffff' }}>O también</span></div>
                                        </div>

                                        <button
                                            onClick={handleMagicLink}
                                            disabled={isLoading || !email}
                                            className="flex w-full justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                                        >
                                            Enviar Enlace Mágico
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {/* WhatsApp Login */}
                        {loginMethod === 'phone' && (
                            <>
                                {needsRegistration ? (
                                    /* Registration Form — after OTP verified but no user exists */
                                    <form onSubmit={handlePhoneRegister} className="space-y-4">
                                        <div className="text-center space-y-2">
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50">
                                                <UserPlus size={24} className="text-blue-500" />
                                            </div>
                                            <p className="text-sm font-semibold text-gray-800">
                                                ¡Número verificado! 🎉
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Crea tu cuenta para acceder al portal.
                                                Tu número <span className="font-bold">{phone}</span> quedará asociado.
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Correo electrónico
                                                </label>
                                                <input
                                                    type="email"
                                                    required
                                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:outline-none transition"
                                                    style={{ '--tw-ring-color': primaryColor + '40' } as any}
                                                    placeholder="tu@email.com"
                                                    value={regEmail}
                                                    onChange={(e) => setRegEmail(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Contraseña
                                                </label>
                                                <input
                                                    type="password"
                                                    required
                                                    minLength={6}
                                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:outline-none transition"
                                                    style={{ '--tw-ring-color': primaryColor + '40' } as any}
                                                    placeholder="Mínimo 6 caracteres"
                                                    value={regPassword}
                                                    onChange={(e) => setRegPassword(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading || !regEmail || regPassword.length < 6}
                                            className="flex w-full justify-center items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : (
                                                <>
                                                    <UserPlus size={18} />
                                                    Crear cuenta
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setNeedsRegistration(false); setOtpSent(false); setOtpCode(''); setMessage('') }}
                                            className="flex w-full justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                                        >
                                            Volver al inicio
                                        </button>
                                    </form>
                                ) : !otpSent ? (
                                    <form onSubmit={handleRequestOtp} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Número de WhatsApp
                                            </label>
                                            <div className="relative">
                                                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    required
                                                    className="block w-full rounded-xl border border-gray-200 pl-11 pr-4 py-3 text-sm focus:ring-2 focus:outline-none transition"
                                                    style={{ '--tw-ring-color': primaryColor + '40' } as any}
                                                    placeholder="+56912345678"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                Incluye el código de país (ej: +56, +1, +54)
                                            </p>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading || !phone}
                                            className="flex w-full justify-center items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                                            style={{ backgroundColor: '#25D366' }}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="animate-spin" size={18} />
                                            ) : (
                                                <>
                                                    <MessageCircle size={18} />
                                                    Enviar código por WhatsApp
                                                </>
                                            )}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                                        <div className="text-center space-y-2">
                                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50">
                                                <MessageCircle size={24} className="text-green-500" />
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                Enviamos un código a<br />
                                                <span className="font-bold text-gray-900">{phone}</span>
                                            </p>
                                            {contactName && (
                                                <p className="text-xs text-gray-400">
                                                    Hola {contactName} 👋
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">
                                                Código de verificación
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                maxLength={6}
                                                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] focus:ring-2 focus:outline-none transition"
                                                style={{ '--tw-ring-color': primaryColor + '40' } as any}
                                                placeholder="------"
                                                value={otpCode}
                                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isLoading || otpCode.length !== 6}
                                            className="flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Verificar código'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setOtpSent(false); setOtpCode(''); setMessage('') }}
                                            className="flex w-full justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                                        >
                                            Cambiar número
                                        </button>
                                    </form>
                                )}
                            </>
                        )}

                        {message && (
                            <p className={`text-center text-sm font-medium ${message.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                                {message}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
