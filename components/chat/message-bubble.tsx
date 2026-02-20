'use client'

import { useState } from 'react'
import { FileText, FileSpreadsheet, FileArchive, Download } from 'lucide-react'
import { AudioPlayer } from './audio-player'
import { ImageLightbox } from './image-lightbox'
import type { MessageMedia } from '@/lib/types'

interface MessageBubbleProps {
    content: string
    role: 'user' | 'assistant' | 'system'
    timestamp: string
    media?: MessageMedia | null
}

// Detect if message is emoji-only (1-3 emojis)
const EMOJI_REGEX = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F){1,3}$/u
function isEmojiOnly(text: string): boolean {
    return EMOJI_REGEX.test(text.trim())
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileName?: string) {
    const ext = fileName?.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'pdf':
            return <FileText size={28} className="text-red-500" />
        case 'xls': case 'xlsx': case 'csv':
            return <FileSpreadsheet size={28} className="text-green-600" />
        case 'zip': case 'rar':
            return <FileArchive size={28} className="text-yellow-600" />
        default:
            return <FileText size={28} className="text-blue-500" />
    }
}

export function MessageBubble({ content, role, timestamp, media }: MessageBubbleProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false)
    const isOwn = role === 'user'
    const emojiOnly = !media && isEmojiOnly(content)

    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    // --- Emoji-only message ---
    if (emojiOnly) {
        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className="px-1">
                    <span className="text-5xl leading-tight">{content}</span>
                    <div className={`text-[10px] mt-0.5 ${isOwn ? 'text-right' : 'text-left'} text-gray-400`}>
                        {timeStr}
                    </div>
                </div>
            </div>
        )
    }

    // Base bubble styles
    const bubbleBase = `relative max-w-[75%] md:max-w-[65%] px-3 py-2 shadow-sm`
    const ownBubbleStyle = `bg-blue-50 text-gray-900 rounded-[18px] rounded-br-[4px] border border-blue-100`
    const otherBubbleStyle = `bg-white text-gray-800 rounded-[18px] rounded-bl-[4px] border border-gray-200 shadow-sm`

    // --- Image message ---
    if (media?.type === 'image') {
        return (
            <>
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div
                        className={`${bubbleBase} ${isOwn ? ownBubbleStyle : otherBubbleStyle} p-1 overflow-hidden cursor-pointer`}
                        style={{ maxWidth: '280px' }}
                        onClick={() => setLightboxOpen(true)}
                    >
                        <img
                            src={media.url}
                            alt={media.file_name || 'Image'}
                            className="w-full rounded-[14px] object-cover"
                            loading="lazy"
                            style={{ maxHeight: '300px' }}
                        />
                        {content && (
                            <p className="px-2 pt-1 pb-0.5 text-sm break-words">{content}</p>
                        )}
                        <div className="absolute bottom-2 right-3 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded-full">
                            {timeStr}
                        </div>
                    </div>
                </div>
                {lightboxOpen && (
                    <ImageLightbox
                        src={media.url}
                        alt={media.file_name}
                        onClose={() => setLightboxOpen(false)}
                    />
                )}
            </>
        )
    }

    // --- Audio message ---
    if (media?.type === 'audio') {
        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`${bubbleBase} ${isOwn ? ownBubbleStyle : otherBubbleStyle}`} style={{ minWidth: '260px' }}>
                    <AudioPlayer src={media.url} duration={media.duration} isOwn={isOwn} />
                    <div className={`text-[10px] text-right mt-1 ${isOwn ? 'text-blue-600/50' : 'text-gray-400'}`}>
                        {timeStr}
                    </div>
                </div>
            </div>
        )
    }

    // --- File/Document message ---
    if (media?.type === 'file') {
        return (
            <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
                <div className={`${bubbleBase} ${isOwn ? ownBubbleStyle : otherBubbleStyle}`}>
                    <a
                        href={media.url}
                        download={media.file_name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 group"
                    >
                        <div className="flex-shrink-0">{getFileIcon(media.file_name)}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:underline">
                                {media.file_name || 'Archivo'}
                            </p>
                            {media.file_size && (
                                <p className="text-[11px] text-gray-500">
                                    {formatFileSize(media.file_size)}
                                </p>
                            )}
                        </div>
                        <Download size={16} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                    </a>
                    {content && (
                        <p className="text-sm mt-2 break-words">{content}</p>
                    )}
                    <div className={`text-[10px] text-right mt-1 ${isOwn ? 'text-blue-600/50' : 'text-gray-400'}`}>
                        {timeStr}
                    </div>
                </div>
            </div>
        )
    }

    // --- Text message (default) ---
    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}>
            <div className={`${bubbleBase} ${isOwn ? ownBubbleStyle : otherBubbleStyle}`}>
                <p className="text-[13.5px] break-words whitespace-pre-wrap leading-relaxed">{content}</p>
                <div className={`text-[10px] text-right mt-0.5 ${isOwn ? 'text-blue-600/50' : 'text-gray-400'}`}>
                    {timeStr}
                </div>
            </div>
        </div>
    )
}
