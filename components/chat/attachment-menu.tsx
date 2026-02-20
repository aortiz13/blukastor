'use client'

import { useRef, useEffect } from 'react'
import { Image as ImageIcon, FileText } from 'lucide-react'

interface AttachmentMenuProps {
    onSelectImage: (file: File) => void
    onSelectFile: (file: File) => void
    onClose: () => void
}

export function AttachmentMenu({ onSelectImage, onSelectFile, onClose }: AttachmentMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)
    const imageInputRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        // Delay to avoid immediate close from the click that opened the menu
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside)
        }, 100)
        return () => {
            clearTimeout(timer)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [onClose])

    return (
        <div
            ref={menuRef}
            className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-200"
            style={{ minWidth: '160px' }}
        >
            <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                onClick={() => imageInputRef.current?.click()}
            >
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
                    <ImageIcon size={16} className="text-violet-600" />
                </div>
                <span>Imagen</span>
            </button>
            <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText size={16} className="text-blue-600" />
                </div>
                <span>Documento</span>
            </button>

            {/* Hidden file inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        onSelectImage(e.target.files[0])
                        onClose()
                    }
                }}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt,.zip,.rar,.csv"
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        onSelectFile(e.target.files[0])
                        onClose()
                    }
                }}
            />
        </div>
    )
}
