'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip, Mic, Send } from 'lucide-react'
import { AttachmentMenu } from './attachment-menu'
import { AudioRecorder } from './audio-recorder'

interface ChatInputBarProps {
    onSendText: (text: string) => void
    onSendAudio: (blob: Blob, durationSeconds: number) => void
    onSendFile: (file: File, type: 'image' | 'file') => void
    disabled?: boolean
}

export function ChatInputBar({ onSendText, onSendAudio, onSendFile, disabled }: ChatInputBarProps) {
    const [text, setText] = useState('')
    const [showAttach, setShowAttach] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const hasText = text.trim().length > 0

    // Auto-grow textarea
    const adjustHeight = useCallback(() => {
        const el = textareaRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }, [])

    useEffect(() => {
        adjustHeight()
    }, [text, adjustHeight])

    const handleSendText = () => {
        if (!hasText || disabled) return
        onSendText(text.trim())
        setText('')
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendText()
        }
    }

    // Handle paste for images
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault()
                const file = items[i].getAsFile()
                if (file) onSendFile(file, 'image')
                return
            }
        }
    }

    // --- Recording Mode ---
    if (isRecording) {
        return (
            <AudioRecorder
                onSend={(blob, duration) => {
                    onSendAudio(blob, duration)
                    setIsRecording(false)
                }}
                onCancel={() => setIsRecording(false)}
            />
        )
    }

    return (
        <div className="border-t bg-white px-3 py-2">
            {/* Drop zone hint could be added here */}
            <div className="flex items-end gap-2">
                {/* Attach Button */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setShowAttach(!showAttach)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        type="button"
                    >
                        <Paperclip size={20} />
                    </button>
                    {showAttach && (
                        <AttachmentMenu
                            onSelectImage={(file) => onSendFile(file, 'image')}
                            onSelectFile={(file) => onSendFile(file, 'file')}
                            onClose={() => setShowAttach(false)}
                        />
                    )}
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    disabled={disabled}
                    className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 bg-gray-50 placeholder:text-gray-400 disabled:opacity-50 transition-colors"
                    style={{ maxHeight: '120px', minHeight: '40px' }}
                />

                {/* Send / Mic Button */}
                {hasText ? (
                    <button
                        onClick={handleSendText}
                        disabled={disabled}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white transition-colors flex-shrink-0 disabled:opacity-50"
                        type="button"
                    >
                        <Send size={18} className="ml-0.5" />
                    </button>
                ) : (
                    <button
                        onClick={() => setIsRecording(true)}
                        disabled={disabled}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0 disabled:opacity-50"
                        type="button"
                    >
                        <Mic size={20} />
                    </button>
                )}
            </div>
        </div>
    )
}
