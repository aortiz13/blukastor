'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

function RootLoginPageContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [forgotMode, setForgotMode] = useState(false)
    const supabase = createClient()
    const { t } = useTranslation()

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
            // Redirect to dashboard for admin/root login
            window.location.href = '/dashboard'
        }
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            setMessage('Error: ' + t('login.enterEmail'))
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
                setMessage('Error: ' + (data.error || t('login.sendError')))
            } else {
                setMessage('✅ ' + data.message)
            }
        } catch (err: any) {
            setMessage('Error: ' + err.message)
        }
        setIsLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">Blukastor Admin</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        {forgotMode ? t('login.recoverPassword') : t('login.systemAccess')}
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {forgotMode ? (
                        /* Forgot Password Mode */
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-2">
                                <input
                                    type="email"
                                    placeholder={t('login.emailAddress')}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="mr-2 animate-spin" size={20} /> : t('login.sendResetLink')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setForgotMode(false); setMessage('') }}
                                className="flex w-full justify-center text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                            >
                                ← {t('login.backToLogin')}
                            </button>
                        </form>
                    ) : (
                        /* Normal Login Mode */
                        <>
                            <form onSubmit={handlePasswordLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <input
                                        type="email"
                                        placeholder={t('login.emailAddress')}
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <input
                                        type="password"
                                        placeholder={t('login.password')}
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => { setForgotMode(true); setMessage('') }}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium transition"
                                    >
                                        {t('login.forgotPassword')}
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="mr-2 animate-spin" size={20} /> : t('login.enterWithPassword')}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {message && (
                    <p className={`mt-4 text-center text-sm font-medium ${message.startsWith('Error') ? 'text-red-500' : 'text-blue-600'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

export default function RootLoginPage() {
    return (
        <LanguageProvider>
            <RootLoginPageContent />
        </LanguageProvider>
    )
}
