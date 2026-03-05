'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { MessageSquare, X, Loader2, Send, ChevronDown, Sparkles } from 'lucide-react'
import { processAIChatMessage } from '@/lib/actions/chat'
import type { Message } from '@/lib/types/chat'

interface FloatingChatProps {
    contactId: string
    companyId: string
    projectName: string
    primaryColor?: string
}

export function FloatingChat({ contactId, companyId, projectName, primaryColor = '#6366f1' }: FloatingChatProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showScrollBtn, setShowScrollBtn] = useState(false)
    const [hasNewMessages, setHasNewMessages] = useState(false)

    const supabase = createClient()
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const isAtBottomRef = useRef(true)

    const bgStyle: React.CSSProperties = {
        backgroundColor: '#f8f9fb',
        backgroundImage: `radial-gradient(circle, #e4e6ea 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
    }

    const checkIsAtBottom = useCallback(() => {
        const el = scrollRef.current
        if (!el) return true
        return el.scrollHeight - el.scrollTop - el.clientHeight < 60
    }, [])

    const scrollToBottom = useCallback((smooth = true) => {
        const el = scrollRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
        setShowScrollBtn(false)
    }, [])

    // Fetch messages + realtime only when panel is open
    useEffect(() => {
        if (!isOpen) return

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('wa_consolidated')
                .select('*')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: true })
            if (data) {
                setMessages(data.map((d: any) => ({ ...d, media: d.media || null })))
                setTimeout(() => scrollToBottom(false), 50)
            }
        }
        fetchMessages()

        const channel = supabase
            .channel(`floating_chat_${contactId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'wa', table: 'wa_consolidated',
                filter: `contact_id=eq.${contactId}`
            }, (payload) => {
                const newMsg = { ...payload.new, media: (payload.new as any).media || null } as Message
                setMessages((prev) => {
                    if (prev.some((m) => m.id === newMsg.id)) return prev
                    const tempIdx = prev.findIndex((m) => String(m.id).startsWith('temp') && m.role === newMsg.role)
                    if (tempIdx !== -1) { const u = [...prev]; u[tempIdx] = newMsg; return u }
                    return [...prev, newMsg]
                })
                if (!isAtBottomRef.current) setShowScrollBtn(true)
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [isOpen, contactId])

    useEffect(() => {
        if (isAtBottomRef.current && isOpen) scrollToBottom(false)
    }, [messages, isOpen, scrollToBottom])

    const handleScroll = useCallback(() => {
        const atBottom = checkIsAtBottom()
        isAtBottomRef.current = atBottom
        if (atBottom) setShowScrollBtn(false)
    }, [checkIsAtBottom])

    const handleSend = async () => {
        const text = input.trim()
        if (!text || isLoading) return
        setInput('')
        setIsLoading(true)

        setMessages((prev) => [...prev, {
            id: 'temp-user-' + Date.now(), content: text, role: 'user', created_at: new Date().toISOString(),
        }])
        scrollToBottom()

        try {
            const result = await processAIChatMessage(contactId, companyId, text)
            if (result.success) {
                setMessages((prev) => [...prev, {
                    id: 'temp-ai-' + Date.now(), content: result.data.assistant_reply,
                    role: 'assistant' as const, created_at: new Date().toISOString(),
                    agent_type: result.data.agent_type || 'general',
                }])
            }
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setIsLoading(false)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    }

    const toggleOpen = () => {
        setIsOpen(!isOpen)
        setHasNewMessages(false)
        if (!isOpen) setTimeout(() => inputRef.current?.focus(), 300)
    }

    return (
        <>
            {/* Chat Panel */}
            <div
                className="fixed bottom-24 right-6 z-50 flex flex-col overflow-hidden transition-all duration-300 ease-out"
                style={{
                    width: isOpen ? '400px' : '0px',
                    height: isOpen ? '550px' : '0px',
                    opacity: isOpen ? 1 : 0,
                    borderRadius: '20px',
                    boxShadow: isOpen ? '0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)' : 'none',
                    pointerEvents: isOpen ? 'auto' : 'none',
                    transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
                    maxWidth: 'calc(100vw - 48px)',
                    maxHeight: 'calc(100dvh - 120px)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)` }}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-white font-semibold text-sm truncate">Agente IA</h3>
                            <p className="text-white/70 text-[11px] truncate">{projectName}</p>
                        </div>
                    </div>
                    <button onClick={toggleOpen}
                        className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
                        <X size={14} className="text-white" />
                    </button>
                </div>

                {/* Messages */}
                <div ref={scrollRef} onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 py-3 relative" style={bgStyle}>
                    {messages.length === 0 && !isLoading && (
                        <div className="text-center mt-12">
                            <div className="inline-block bg-white/80 backdrop-blur px-5 py-4 rounded-2xl shadow-sm">
                                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                                    style={{ background: `${primaryColor}15` }}>
                                    <Sparkles size={22} style={{ color: primaryColor }} />
                                </div>
                                <p className="text-gray-600 text-sm font-medium">¡Hola! 👋</p>
                                <p className="text-gray-400 text-xs mt-1 max-w-[220px]">
                                    Soy tu asistente para <strong>{projectName}</strong>. Pregúntame sobre metas, finanzas o lo que necesites.
                                </p>
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex mb-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'rounded-[16px] rounded-br-[4px] text-white'
                                    : 'bg-white text-gray-800 rounded-[16px] rounded-bl-[4px] border border-gray-100'
                                }`} style={msg.role === 'user' ? { background: primaryColor } : undefined}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start mb-2">
                            <div className="bg-white text-gray-500 rounded-[16px] rounded-bl-[4px] px-3.5 py-2.5 shadow-sm flex items-center gap-2 border border-gray-100">
                                <Loader2 size={13} className="animate-spin" />
                                <span className="text-xs">Escribiendo...</span>
                            </div>
                        </div>
                    )}

                    {showScrollBtn && (
                        <button onClick={() => scrollToBottom()}
                            className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-white shadow-md rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors z-10 border border-gray-200">
                            <ChevronDown size={14} className="text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Input */}
                <div className="border-t bg-white px-3 py-2.5 flex items-end gap-2 flex-shrink-0">
                    <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown} placeholder="Escribe un mensaje..." rows={1}
                        className="flex-1 resize-none border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent bg-gray-50/50 placeholder-gray-400 max-h-24"
                        disabled={isLoading} />
                    <button onClick={handleSend} disabled={isLoading || !input.trim()}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 flex-shrink-0"
                        style={{ background: primaryColor }}>
                        <Send size={15} className="text-white" />
                    </button>
                </div>
            </div>

            {/* FAB Button */}
            <button onClick={toggleOpen}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
                title={`Chat con agente de ${projectName}`}>
                <div className="transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(90deg) scale(0)' : 'rotate(0) scale(1)' }}>
                    <MessageSquare size={22} className="text-white" />
                </div>
                <div className="absolute transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(0) scale(1)' : 'rotate(-90deg) scale(0)' }}>
                    <X size={22} className="text-white" />
                </div>
                {!isOpen && <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: primaryColor }} />}
                {hasNewMessages && !isOpen && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />}
            </button>
        </>
    )
}
