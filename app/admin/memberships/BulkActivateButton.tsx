'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function Zap({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    )
}

function X({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    )
}

function AlertTriangle({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    )
}

function CheckCircle({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}

export function BulkActivateButton() {
    const router = useRouter()
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; updatedCount?: number; expiresAt?: string; error?: string } | null>(null)

    const handleActivate = async () => {
        setLoading(true)
        setResult(null)

        try {
            const res = await fetch('/api/admin/bulk-activate-memberships', {
                method: 'POST',
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al activar membresías')
            }

            setResult({ success: true, updatedCount: data.updatedCount, expiresAt: data.expiresAt })
            router.refresh()
        } catch (err: any) {
            setResult({ success: false, error: err.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => { setShowConfirm(true); setResult(null) }}
                className="bg-amber-500 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-600 transition shadow-lg shadow-amber-500/20"
            >
                <Zap size={18} />
                <span>Activar Todas (3 meses)</span>
            </button>

            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 rounded-xl">
                                    <AlertTriangle size={22} className="text-amber-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Activación Masiva</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Modo de prueba — 3 meses</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {result?.success ? (
                                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-start gap-3">
                                    <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-green-800">
                                            ¡{result.updatedCount} membresías activadas!
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">
                                            Expiran el {new Date(result.expiresAt!).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            ) : result?.error ? (
                                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                                    {result.error}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">
                                            Esta acción activará <strong>todas</strong> las membresías de los usuarios por un período de <strong>3 meses</strong> a partir de hoy.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Duración</span>
                                            <span className="font-bold text-gray-900">3 meses</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Inicio</span>
                                            <span className="font-bold text-gray-900">
                                                {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Expiración</span>
                                            <span className="font-bold text-gray-900">
                                                {(() => {
                                                    const d = new Date()
                                                    d.setMonth(d.getMonth() + 3)
                                                    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Alcance</span>
                                            <span className="font-bold text-gray-900">Todos los usuarios</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-0">
                            {result?.success ? (
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
                                >
                                    Cerrar
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        disabled={loading}
                                        className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleActivate}
                                        disabled={loading}
                                        className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Activando...
                                            </>
                                        ) : (
                                            'Confirmar Activación'
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
