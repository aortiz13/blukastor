'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Eye, Trash2 } from 'lucide-react'
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
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-48 z-40 animate-in fade-in zoom-in-95 duration-150">
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
