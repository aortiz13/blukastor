'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Trash2, Bot, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import UserDetailsModal from './user-details-modal'

interface UserActionsMenuProps {
    contactId: string
    contactName: string
    companyId: string
    onDeleted: () => void
}

export default function UserActionsMenu({ contactId, contactName, companyId, onDeleted }: UserActionsMenuProps) {
    const [open, setOpen] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
    const [aiToggling, setAiToggling] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleEscape)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleEscape)
        }
    }, [open])

    // Fetch AI status when menu opens
    useEffect(() => {
        if (open && aiEnabled === null) {
            fetch(`/api/corporate/user-details?contactId=${contactId}`)
                .then(res => res.json())
                .then(data => setAiEnabled(data.aiEnabled ?? true))
                .catch(() => setAiEnabled(true))
        }
    }, [open, contactId, aiEnabled])

    const handleAiToggle = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (aiToggling) return
        setAiToggling(true)
        const newValue = !(aiEnabled ?? true)
        try {
            const res = await fetch('/api/corporate/user-ai-toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId, enabled: newValue }),
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

    const currentAi = aiEnabled ?? true

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
                >
                    <MoreVertical size={16} />
                </button>

                {open && (
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-52 z-40 animate-in fade-in zoom-in-95 duration-150">
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setOpen(false)
                                setShowDetails(true)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
                        >
                            <Eye size={14} className="text-gray-400" />
                            Ver detalles
                        </button>
                        <div className="h-px bg-gray-100 mx-2" />
                        {/* AI Toggle inline */}
                        <button
                            onClick={handleAiToggle}
                            disabled={aiToggling}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between transition-colors"
                        >
                            <span className="flex items-center gap-2.5">
                                <Bot size={14} className="text-gray-400" />
                                Agente AI
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
                        <div className="h-px bg-gray-100 mx-2" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setOpen(false)
                                setShowDetails(true)
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                        >
                            <Trash2 size={14} />
                            Eliminar usuario
                        </button>
                    </div>
                )}
            </div>

            {showDetails && (
                <UserDetailsModal
                    contactId={contactId}
                    contactName={contactName}
                    companyId={companyId}
                    onClose={() => setShowDetails(false)}
                    onDeleted={onDeleted}
                />
            )}
        </>
    )
}
