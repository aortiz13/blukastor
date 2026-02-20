'use client'

import { useEffect, useCallback } from 'react'
import { X, Download } from 'lucide-react'

interface ImageLightboxProps {
    src: string
    alt?: string
    onClose: () => void
}

export function ImageLightbox({ src, alt = 'Image', onClose }: ImageLightboxProps) {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
    }, [onClose])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [handleKeyDown])

    const handleDownload = () => {
        const a = document.createElement('a')
        a.href = src
        a.download = alt || 'download'
        a.target = '_blank'
        a.click()
    }

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
            onClick={onClose}
        >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
                <span className="text-white/70 text-sm truncate max-w-[60%]">{alt}</span>
                <div className="flex gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownload() }}
                        className="text-white/70 hover:text-white transition-colors p-2"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors p-2"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Image */}
            <img
                src={src}
                alt={alt}
                className="max-w-[90vw] max-h-[85vh] object-contain select-none"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    )
}
