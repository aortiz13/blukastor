'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCompanyByDomain } from '@/lib/data/companies'
import { Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'

export default function LoginPage() {
    const params = useParams()
    const rawDomain = params?.domain as string
    const domain = decodeURIComponent(rawDomain || '')

    const [company, setCompany] = useState<any>(null)
    const [loadingCompany, setLoadingCompany] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="relative z-10 flex flex-col justify-end p-12">
                            <h2
                                className="text-3xl font-bold text-white max-w-md leading-tight"
                                style={{ fontFamily: `'${fontHeading}', sans-serif` }}
                            >
                                {welcomeText}
                            </h2>
                        </div>
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
                        {/* Header */}
                        <div className="text-center">
                            <h1
                                className="text-2xl font-bold text-gray-900"
                                style={{ fontFamily: `'${fontHeading}', sans-serif` }}
                            >
                                {welcomeText}
                            </h1>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handlePasswordLogin} className="space-y-4">
                            <div className="space-y-3">
                                <input
                                    type="email"
                                    required
                                    className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:outline-none transition"
                                    style={{ '--tw-ring-color': primaryColor + '40', borderColor: 'rgb(229,231,235)' } as any}
                                    placeholder="Email"
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
                            Enviar Magic Link
                        </button>

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
