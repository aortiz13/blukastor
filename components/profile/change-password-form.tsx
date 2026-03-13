'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChangePasswordForm() {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess(false)

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
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newPassword }),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error al cambiar la contraseña')
            } else {
                setSuccess(true)
                setNewPassword('')
                setConfirmPassword('')
                setTimeout(() => setSuccess(false), 5000)
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado')
        }
        setIsLoading(false)
    }

    return (
        <div className="p-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 rounded-xl">
                    <Shield className="text-amber-600" size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Cambiar Contraseña</h3>
                    <p className="text-gray-400 text-xs">Actualiza tu contraseña de acceso</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                        Nueva Contraseña
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); setError(''); setSuccess(false) }}
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                            required
                            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                        Confirmar Contraseña
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); setSuccess(false) }}
                            placeholder="Repite tu nueva contraseña"
                            minLength={6}
                            required
                            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 transition-all"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl font-medium">{error}</p>
                )}

                {success && (
                    <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 p-3 rounded-xl font-medium">
                        <CheckCircle2 size={16} />
                        ¡Contraseña actualizada exitosamente!
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !newPassword || !confirmPassword}
                    className={cn(
                        'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
                        newPassword && confirmPassword
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200 hover:shadow-xl'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                    Cambiar Contraseña
                </button>
            </form>
        </div>
    )
}
