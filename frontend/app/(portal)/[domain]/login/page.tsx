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
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const supabase = createClient()

    useEffect(() => {
        if (domain) {
            getCompanyByDomain(domain).then(setCompany)
        }
    }, [domain])

    const handleLogin = async (e: React.FormEvent) => {
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

    const branding = company?.frontend_config || {}

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
                <div className="text-center">
                    {branding.logo_url && <img src={branding.logo_url} alt="Logo" className="mx-auto h-12 w-auto" />}
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                        Sign in to {company?.name || 'Portal'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-500">
                        Enter your email to receive a magic link.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="relative block w-full rounded border-0 p-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-black sm:text-sm sm:leading-6"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                            style={{ backgroundColor: branding.primary_color || '#000000' }}
                        >
                            {isLoading ? <Loader2 className="mr-2 animate-spin" size={18} /> : 'Sign in'}
                        </button>
                    </div>
                </form>

                {message && (
                    <p className={`mt-4 text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}

