'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const supabase = createClient()

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
            setMessage('Check your email for the admin magic link!')
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900">
            <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold text-gray-900">Blukastor Admin</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        System Management Access
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div>
                        <input
                            type="email"
                            placeholder="Admin Email"
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
                        {isLoading ? <Loader2 className="mr-2 animate-spin" size={20} /> : 'Send Magic Link'}
                    </button>
                </form>

                {message && (
                    <p className={`mt-4 text-center text-sm font-medium ${message.startsWith('Error') ? 'text-red-500' : 'text-blue-600'}`}>
                        {message}
                    </p>
                )}
            </div>
        </div>
    )
}
