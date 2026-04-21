'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, Eye, Trash2, Bot, Loader2 } from 'lucide-react'
import { UserDetailsModal } from './user-details-modal'

function cn(...inputs: any[]) { return inputs.filter(Boolean).join(' ') }

interface UserActionsDropdownProps {
    userId: string
    userEmail: string
    companyId?: string
    isAdmin?: boolean
}

export function UserActionsDropdown({ userId, userEmail, companyId, isAdmin = false }: UserActionsDropdownProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
    const [aiToggling, setAiToggling] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Fetch AI status when menu opens (only for users with a companyId)
    useEffect(() => {
        if (isOpen && aiEnabled === null && companyId) {
            fetch(`/api/corporate/user-details?contactId=${userId}`)
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) setAiEnabled(data.aiEnabled ?? true)
                    else setAiEnabled(true)
                })
                .catch(() => setAiEnabled(true))
        }
    }, [isOpen, userId, companyId, aiEnabled])

    const handleViewDetails = () => {
        setShowDetailsModal(true)
        setIsOpen(false)
    }

    const handleAiToggle = async () => {
        if (aiToggling || !companyId) return
        setAiToggling(true)
        const newValue = !(aiEnabled ?? true)
        try {
            const res = await fetch('/api/corporate/user-ai-toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId: userId, enabled: newValue }),
            })
            if (res.ok) {
                setAiEnabled(newValue)
            }
        } catch (err) {
            console.error('Error toggling AI:', err)
        } finally {
            setAiToggling(false)
        }
    }

    const handleRemoveUser = async () => {
        if (!confirm(`¿Estás seguro de que quieres remover a ${userEmail}?`)) {
            return
        }

        try {
            const url = companyId 
                ? `/api/admin/companies/${companyId}/users/${userId}`
                : `/api/admin/users/${userId}`
                
            const res = await fetch(url, {
                method: 'DELETE'
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Error al remover usuario')
            }

            alert('Usuario removido exitosamente')
            router.refresh()
        } catch (error: any) {
            alert(`Error: ${error.message}`)
        }

        setIsOpen(false)
    }

    const currentAi = aiEnabled ?? true

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-black p-2 rounded-lg transition-colors"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <button
                        onClick={handleViewDetails}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                        <Eye size={16} className="text-gray-400" />
                        <span>Ver detalles</span>
                    </button>

                    {/* AI Agent Toggle */}
                    {companyId && (
                        <>
                            <div className="my-1 border-t border-gray-100"></div>
                            <button
                                onClick={handleAiToggle}
                                disabled={aiToggling}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                            >
                                <span className="flex items-center gap-3">
                                    <Bot size={16} className="text-gray-400" />
                                    <span>Agente AI</span>
                                </span>
                                {aiToggling ? (
                                    <Loader2 size={14} className="text-gray-400 animate-spin" />
                                ) : (
                                    <div className={cn(
                                        "w-8 h-[18px] rounded-full transition-colors duration-200 relative flex-shrink-0",
                                        currentAi ? "bg-green-500" : "bg-gray-300"
                                    )}>
                                        <div className={cn(
                                            "absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-sm transition-transform duration-200",
                                            currentAi ? "translate-x-[15px]" : "translate-x-[2px]"
                                        )} />
                                    </div>
                                )}
                            </button>
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <div className="my-1 border-t border-gray-100"></div>

                            <button
                                onClick={handleRemoveUser}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                            >
                                <Trash2 size={16} />
                                <span>Remover acceso</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            <UserDetailsModal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                userId={userId}
                userEmail={userEmail}
            />
        </div>
    )
}
