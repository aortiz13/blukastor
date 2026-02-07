'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const supabase = createClient()

    // NOTE: 'domain', 'getCompanyByDomain', 'setCompany', and 'company' are not defined in the provided context.
    // This useEffect block will cause errors unless these are defined elsewhere.
    // Adding it as per instruction.
    const [company, setCompany] = useState<any>(null) // Added to make 'company' available
    const domain = typeof window !== 'undefined' ? window.location.hostname : '' // Added to make 'domain' available
    const getCompanyByDomain = async (supabaseClient: any, domainName: string) => {
        // Placeholder for actual implementation
        console.log('Fetching company by domain:', domainName)
        return { name: 'Blukastor', frontend_config: { logo_url: '', primary_color: '#000000' } }
    }

    useEffect(() => {
        if (domain) {
            getCompanyByDomain(supabase, domain).then(setCompany)
        }
    }, [domain, supabase])

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
            setMessage('Check your email for the magic link!')
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
            window.location.href = '/dashboard'
        }
    }

    const branding = company?.frontend_config || {}

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">Blukastor Admin</h1>
                </div>

                <div className="mt-8 space-y-6">
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                        <div className="space-y-2">
                            <input
                                type="email"
                                placeholder="Admin Email"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="mr-2 animate-spin" size={20} /> : 'Login with Password'}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">Or</span></div>
                    </div>

                    <button
                        onClick={handleMagicLink}
                        disabled={isLoading}
                        className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                        Send Magic Link
                    </button>
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
