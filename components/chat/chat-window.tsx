'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, PlusCircle, ChevronDown } from 'lucide-react'
import { processAIChatMessage } from '@/lib/actions/chat'
import { MessageBubble } from './message-bubble'
import { ChatInputBar } from './chat-input-bar'
import type { Message } from '@/lib/types/chat'
import type { MessageMedia } from '@/lib/types/chat'

// Clean neutral background with subtle dot pattern
const chatBgStyle: React.CSSProperties = {
    backgroundColor: '#f4f5f7',
    backgroundImage: `radial-gradient(circle, #ddd 1px, transparent 1px)`,
    backgroundSize: '24px 24px',
}

import type { Agent } from '@/lib/types/chat'
// ... imports ...

export function ChatWindow({ contactId, companyId, selectedAgent }: {
    contactId: string,
    companyId: string,
    selectedAgent?: Agent | null
}) {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showScrollBtn, setShowScrollBtn] = useState(false)
    const [newMsgCount, setNewMsgCount] = useState(0)
    const supabase = createClient()
    const scrollRef = useRef<HTMLDivElement>(null)
    const isAtBottomRef = useRef(true)

    // Check if user is scrolled to bottom
    const checkIsAtBottom = useCallback(() => {
        const el = scrollRef.current
        if (!el) return true
        const threshold = 80
        return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    }, [])

    const scrollToBottom = useCallback((smooth = true) => {
        const el = scrollRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
        setShowScrollBtn(false)
        setNewMsgCount(0)
    }, [])

    // Fetch initial messages
    useEffect(() => {
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('wa_consolidated')
                .select('*')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: true })

            if (data) {
                setMessages(data.map((d: any) => ({
                    ...d,
                    media: d.media || null,
                })))
            }
        }

        fetchMessages()

        const channel = supabase
            .channel('chat_updates')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'wa',
                    table: 'wa_consolidated',
                    filter: `contact_id=eq.${contactId}`
                },
                (payload) => {
                    const newMsg = { ...payload.new, media: (payload.new as any).media || null } as Message
                    setMessages((prev) => {
                        // Check if we already have this message by real ID
                        if (prev.some((m) => m.id === newMsg.id)) return prev

                        // Find the oldest temp message with the same role to replace
                        const tempIdx = prev.findIndex(
                            (m) => String(m.id).startsWith('temp') && m.role === newMsg.role
                        )
                        if (tempIdx !== -1) {
                            // Replace the temp message with the real one
                            const updated = [...prev]
                            updated[tempIdx] = newMsg
                            return updated
                        }

                        // No temp to replace — append (e.g. message from another device)
                        return [...prev, newMsg]
                    })

                    if (!isAtBottomRef.current) {
                        setNewMsgCount((c) => c + 1)
                        setShowScrollBtn(true)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [contactId])

    // Auto-scroll when messages change (only if at bottom)
    useEffect(() => {
        if (isAtBottomRef.current) {
            scrollToBottom(false)
        }
    }, [messages, scrollToBottom])

    // Track scroll position
    const handleScroll = useCallback(() => {
        const atBottom = checkIsAtBottom()
        isAtBottomRef.current = atBottom
        if (atBottom) {
            setShowScrollBtn(false)
            setNewMsgCount(0)
        }
    }, [checkIsAtBottom])

    // Upload file to Supabase Storage
    const uploadFile = async (file: File | Blob, fileName: string): Promise<string | null> => {
        const filePath = `${contactId}/${Date.now()}_${fileName}`
        const { error } = await supabase.storage
            .from('chat-media')
            .upload(filePath, file, { upsert: true })

        if (error) {
            console.error('Upload error:', error)
            return null
        }

        const { data: urlData } = supabase.storage
            .from('chat-media')
            .getPublicUrl(filePath)

        return urlData.publicUrl
    }

    const handleSendText = async (text: string) => {
        if (isLoading) return
        setIsLoading(true)

        // Add optimistic user message (will be replaced by realtime)
        const userMsg: Message = {
            id: 'temp-user-' + Date.now(),
            content: text,
            role: 'user',
            created_at: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMsg])
        scrollToBottom()

        // Add optimistic AI placeholder (will be replaced by realtime)
        const aiPlaceholderId = 'temp-ai-' + Date.now()
        try {
            // PASS SELECTED AGENT TYPE AS FORCE PARAMETER
            const agentIdToForce = selectedAgent?.agent_type

            const result = await processAIChatMessage(contactId, companyId, text, agentIdToForce)
            if (result.success) {
                setMessages((prev) => [...prev, {
                    id: aiPlaceholderId,
                    content: result.data.assistant_reply,
                    role: 'assistant' as const,
                    created_at: new Date().toISOString(),
                    agent_type: result.data.agent_type || 'general',
                }])
            }
        } catch (error) {
            console.error('Error sending message:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSendAudio = async (blob: Blob, durationSeconds: number) => {
        setIsLoading(true)
        const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
        const fileName = `audio_${Date.now()}.${ext}`
        const url = await uploadFile(blob, fileName)

        if (url) {
            const media: MessageMedia = {
                type: 'audio',
                url,
                mime_type: blob.type,
                file_name: fileName,
                duration: durationSeconds,
            }
            const userMsg: Message = {
                id: 'temp-audio-' + Date.now(),
                content: '🎤 Audio',
                role: 'user',
                created_at: new Date().toISOString(),
                media,
            }
            setMessages((prev) => [...prev, userMsg])
            scrollToBottom()

            // Also send text representation to AI
            try {
                const result = await processAIChatMessage(contactId, companyId, '[El usuario envió un mensaje de audio]', selectedAgent?.agent_type)
                if (result.success) {
                    const aiMsg: Message = {
                        id: 'temp-ai-' + Date.now(),
                        content: result.data.assistant_reply,
                        role: 'assistant',
                        created_at: new Date().toISOString(),
                        agent_type: result.data.agent_type || 'general',
                    }
                    setMessages((prev) => [...prev, aiMsg])
                }
            } catch (error) {
                console.error('Error processing audio:', error)
            }
        }
        setIsLoading(false)
    }

    const handleSendFile = async (file: File, type: 'image' | 'file') => {
        setIsLoading(true)
        const url = await uploadFile(file, file.name)

        if (url) {
            const media: MessageMedia = {
                type,
                url,
                mime_type: file.type,
                file_name: file.name,
                file_size: file.size,
            }
            const userMsg: Message = {
                id: 'temp-file-' + Date.now(),
                content: type === 'image' ? '' : `📎 ${file.name}`,
                role: 'user',
                created_at: new Date().toISOString(),
                media,
            }
            setMessages((prev) => [...prev, userMsg])
            scrollToBottom()

            // Notify AI about attachment
            try {
                const desc = type === 'image'
                    ? '[El usuario envió una imagen]'
                    : `[El usuario envió un archivo: ${file.name}]`

                // Pass the image URL as the last parameter only if it's an image
                const mediaUrl = type === 'image' ? url : undefined;

                const result = await processAIChatMessage(contactId, companyId, desc, selectedAgent?.agent_type, mediaUrl)
                if (result.success) {
                    const aiMsg: Message = {
                        id: 'temp-ai-' + Date.now(),
                        content: result.data.assistant_reply,
                        role: 'assistant',
                        created_at: new Date().toISOString(),
                        agent_type: result.data.agent_type || 'general',
                    }
                    setMessages((prev) => [...prev, aiMsg])
                }
            } catch (error) {
                console.error('Error processing file:', error)
            }
        }
        setIsLoading(false)
    }

    const resetChat = async () => {
        if (!confirm('¿Estás seguro de que quieres iniciar una nueva conversación?')) return
        setIsLoading(true)
        try {
            const { error } = await supabase.from('wa_consolidated').delete().eq('contact_id', contactId)
            if (error) throw error
            await supabase.from('ai_chat_memory').delete().eq('contact_id', contactId)
            setMessages([])
        } catch (error) {
            console.error('Error resetting chat:', error)
            alert('Error al reiniciar el chat')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full" style={{ height: '100dvh' }}>
            {/* Header — fixed 60px */}
            <div className="h-[60px] border-b px-4 bg-primary flex justify-between items-center flex-shrink-0">
                <div className="flex flex-col">
                    <h2 className="font-semibold text-primary-foreground text-sm">
                        Chat con {selectedAgent ? selectedAgent.agent_name : 'Nova (Auto)'}
                    </h2>
                    {selectedAgent && (
                        <span className="text-[10px] text-primary-foreground/70">
                            Modo forzado: {selectedAgent.agent_type}
                        </span>
                    )}
                </div>
                <button
                    onClick={resetChat}
                    className="text-xs flex items-center gap-1 text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                    title="Nueva Conversación"
                >
                    <PlusCircle size={14} />
                    <span>Nueva conversación</span>
                </button>
            </div>

            {/* Messages Area — flex:1, scrollable */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-3 relative"
                style={chatBgStyle}
            >
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        content={msg.content}
                        role={msg.role}
                        timestamp={msg.created_at}
                        media={msg.media}
                    />
                ))}

                {messages.length === 0 && !isLoading && (
                    <div className="text-center mt-16">
                        <div className="inline-block bg-white/80 backdrop-blur px-6 py-4 rounded-2xl shadow-sm">
                            <p className="text-gray-500 text-sm">Inicia una conversación con Nova</p>
                            <p className="text-gray-400 text-xs mt-1">Envía un mensaje, audio o archivo</p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="flex justify-start mb-1">
                        <div className="bg-white text-gray-500 rounded-[18px] rounded-bl-[4px] px-4 py-3 shadow-sm flex items-center gap-2 border border-gray-100">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-sm">Nova está escribiendo...</span>
                        </div>
                    </div>
                )}

                {/* Scroll-to-bottom FAB */}
                {showScrollBtn && (
                    <button
                        onClick={() => scrollToBottom()}
                        className="sticky bottom-4 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors z-10 border border-gray-200"
                    >
                        <ChevronDown size={18} className="text-gray-600" />
                        {newMsgCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-medium">
                                {newMsgCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* Input Bar — auto-height, fixed at bottom */}
            <ChatInputBar
                onSendText={handleSendText}
                onSendAudio={handleSendAudio}
                onSendFile={handleSendFile}
                disabled={isLoading}
            />
        </div>
    )
}
