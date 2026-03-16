'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function ShieldBan({ size, ...props }: any) {
    return (
        <svg {...props} width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="4" y1="4" x2="20" y2="20" />
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

interface ClientCompany {
    id: string
    name: string
}

export function BanUserButton() {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [phone, setPhone] = useState('')
    const [clientCompanyId, setClientCompanyId] = useState('')
    const [reason, setReason] = useState('')
    const [bannedBy, setBannedBy] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [companies, setCompanies] = useState<ClientCompany[]>([])

    useEffect(() => {
        if (isModalOpen) {
            fetch('/api/admin/companies')
                .then(r => r.json())
                .then(data => {
                    if (data.companies) setCompanies(data.companies)
                })
                .catch(() => {})
        }
    }, [isModalOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/admin/users/ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    client_company_id: clientCompanyId,
                    reason: reason || undefined,
                    banned_by: bannedBy || undefined,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error al bannear usuario')
            }

            setIsModalOpen(false)
            setPhone('')
            setClientCompanyId('')
            setReason('')
            setBannedBy('')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-600 transition shadow-lg shadow-amber-500/10"
            >
                <ShieldBan size={16} />
                <span>Bannear Usuario</span>
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Bannear Usuario</h2>
                                <p className="text-sm text-gray-500 mt-1">El usuario será bloqueado de la plataforma</p>
                            </div>
                            <button
                                onClick={() => { setIsModalOpen(false); setError('') }}
                                className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Teléfono del usuario *
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="ej: 56912345678"
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Empresa (Instancia) *
                                </label>
                                <select
                                    value={clientCompanyId}
                                    onChange={(e) => setClientCompanyId(e.target.value)}
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                                >
                                    <option value="">Seleccionar empresa...</option>
                                    {companies.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Razón del ban
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Motivo por el cual se bannea al usuario..."
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Banneado por
                                </label>
                                <input
                                    type="text"
                                    value={bannedBy}
                                    onChange={(e) => setBannedBy(e.target.value)}
                                    placeholder="Tu nombre o email"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setError('') }}
                                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Banneando...' : 'Confirmar Ban'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
