'use client'

import { useState } from 'react'
import { ChatSidebar } from './chat-sidebar'
import { ChatWindow } from './chat-window'
import type { Agent } from '@/lib/types/chat'

interface ChatLayoutProps {
    agents: Agent[]
    contactId: string
    companyId: string
}

export function ChatLayout({ agents, contactId, companyId }: ChatLayoutProps) {
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

    const selectedAgent = agents.find(a => a.id === selectedAgentId) || null

    return (
        <div className="flex h-full overflow-hidden">
            {/* Sidebar: List of Agents */}
            <div className="w-80 border-r bg-gray-50/40">
                <ChatSidebar
                    agents={agents}
                    selectedAgentId={selectedAgentId}
                    onSelectAgent={setSelectedAgentId}
                />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <ChatWindow
                    contactId={contactId}
                    companyId={companyId}
                    selectedAgent={selectedAgent}
                />
            </div>
        </div>
    )
}
