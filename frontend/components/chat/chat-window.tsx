'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface Message {
    id: string
    content: string
    role: 'user' | 'system' | 'assistant'
    created_at: string
    agent_type?: string
}

export function ChatWindow({ contactId, companyId }: { contactId: string, companyId: string }) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()
    const scrollRef = useRef<HTMLDivElement>(null)

    // Fetch initial messages and subscribe
    useEffect(() => {
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .schema('wa')
                .from('wa_consolidated')
                .select('*')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: true })

            if (data) setMessages(data as any)
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
                    setMessages((prev) => [...prev, payload.new as any])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [contactId])

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        const content = input.trim()
        setInput('')
        // Optimistic update? No, let's wait for subscription or distinct logic.
        // Actually, wa_consolidated is populated by Trigger? Or do I insert into wa_consolidated?
        // I insert into wa_incoming. Trigger/Workflow populates wa_consolidated.
        // So I won't see my message immediately unless I optimistically add it.

        // Optimistic:
        const optimisticMsg = {
            id: 'temp-' + Date.now(),
            content,
            role: 'user' as const,
            created_at: new Date().toISOString()
        }
        setMessages((prev) => [...prev, optimisticMsg])

        const { error } = await supabase
            .schema('wa')
            .from('wa_incoming')
            .insert({
                contact_id: contactId,
                company_id: companyId,
                content,
                processed: false,
                // manual_ai_intent: 'general' // or specific agent
            })

        if (error) {
            console.error('Error sending message:', error)
            // Rollback optimistic update implementation needed here ideally
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg p-3 max-w-[80%] ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-gray-200 text-gray-800 rounded-bl-none'
                            }`}>
                            {msg.content}
                            <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        Start a conversation with our AI agents.
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t p-4 bg-white">
                <form className="flex gap-2" onSubmit={sendMessage}>
                    <input
                        className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="bg-blue-600 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    )
}
