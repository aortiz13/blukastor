// ============================================================================
// Monitoring Domain Types
// ============================================================================

export interface ErrorFilters {
    severity?: 'critical' | 'warning' | 'info'
    origin?: string
    startDate?: string
    endDate?: string
    resolved?: boolean
    companyId?: string
}

export interface AuditFilters {
    action?: string
    tableName?: string
    startDate?: string
    endDate?: string
    companyId?: string
}

export interface DateRange {
    startDate: string
    endDate: string
}

export interface ConversationFilters {
    companyId?: string
    contactId?: string
    agentType?: string
    startDate?: string
    endDate?: string
    searchTerm?: string
    limit?: number
}

export interface WhatsAppMessage {
    id: string
    role: string
    content: string
    timestamp: string
    agentType?: string
    agentSummary?: string
    media?: any
    metadata: {
        aiStatus?: string
        agentAction?: string
        wasSummarized?: boolean
        tokenCount?: number
    }
    aiStatus?: string
    agentAction?: string
    wasSummarized?: boolean
    tokenCount?: number
}

export interface AIChatMessage {
    id: string
    role: string
    content: string
    timestamp: string
    agentType?: string
    contentType?: string
    metadata: Record<string, any>
}

export type ConversationMessage = WhatsAppMessage | AIChatMessage

export interface ConversationTranscript {
    source: 'whatsapp' | 'ai_chat'
    messages: ConversationMessage[]
}
