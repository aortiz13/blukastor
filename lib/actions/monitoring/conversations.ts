'use server'

import { createClient } from '@/lib/supabase/server'
import type {
    ConversationFilters,
    WhatsAppMessage,
    AIChatMessage,
    ConversationTranscript,
    DateRange,
} from '@/lib/types/monitoring'

/**
 * Get conversation sessions with optional filters
 */
export async function getConversationSessions(filters: ConversationFilters = {}) {
    const supabase = await createClient()

    let query = supabase
        .from('conversation_sessions')
        .select('*')
        .order('session_end', { ascending: false })

    if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
    }

    if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId)
    }

    if (filters.agentType) {
        query = query.ilike('agent_types', `%${filters.agentType}%`)
    }

    if (filters.startDate) {
        query = query.gte('session_start', filters.startDate)
    }

    if (filters.endDate) {
        query = query.lte('session_end', filters.endDate)
    }

    if (filters.searchTerm) {
        query = query.or(`phone.ilike.%${filters.searchTerm}%,real_name.ilike.%${filters.searchTerm}%,push_name.ilike.%${filters.searchTerm}%`)
    }

    const { data, error } = await query.limit(filters.limit || 50)

    if (error) {
        console.error('Error fetching conversation sessions:', error)
        throw new Error('Failed to fetch conversation sessions')
    }

    return data
}

/**
 * Get full transcript for a conversation session
 */
export async function getConversationTranscript(sessionId: string): Promise<ConversationTranscript> {
    const supabase = await createClient()

    // Check if this is a WhatsApp session (format: {contact_id}_wa_{session_group})
    if (sessionId.includes('_wa_')) {
        const parts = sessionId.split('_wa_')
        const contactId = parts[0]

        const { data: sessionData } = await supabase
            .from('conversation_sessions')
            .select('session_start, session_end')
            .eq('session_id', sessionId)
            .single()

        if (!sessionData) {
            throw new Error('Session not found')
        }

        const { data: waMessages, error: waError } = await supabase
            .from('wa_consolidated')
            .select('*')
            .eq('contact_id', contactId)
            .gte('timestamp', sessionData.session_start)
            .lte('timestamp', sessionData.session_end)
            .order('timestamp', { ascending: true })

        if (waError) {
            console.error('Error fetching WhatsApp transcript:', waError)
            throw new Error('Failed to fetch WhatsApp transcript')
        }

        return {
            source: 'whatsapp',
            messages: waMessages.map(msg => ({
                id: msg.id,
                role: msg.role || 'user',
                content: msg.content,
                timestamp: msg.timestamp,
                agentType: msg.agent_type,
                agentSummary: msg.agent_summary,
                media: msg.media,
                metadata: {
                    aiStatus: msg.ai_status,
                    agentAction: msg.agent_action,
                    wasSummarized: msg.was_summarized,
                    tokenCount: msg.token_count
                }
            })) as WhatsAppMessage[]
        }
    }

    // If not WhatsApp, try ai_chat_memory
    const { data: aiMessages, error: aiError } = await supabase
        .from('ai_chat_memory')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

    if (aiError) {
        console.error('Error fetching conversation transcript:', aiError)
        throw new Error('Failed to fetch conversation transcript')
    }

    return {
        source: 'ai_chat',
        messages: aiMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at,
            agentType: msg.agent_type,
            contentType: msg.content_type,
            metadata: msg.metadata || {}
        })) as AIChatMessage[]
    }
}

/**
 * Get conversation metrics for dashboard KPIs
 */
export async function getConversationMetrics(dateRange?: DateRange) {
    const supabase = await createClient()

    let query = supabase
        .from('conversation_sessions')
        .select('*')

    if (dateRange?.startDate) {
        query = query.gte('session_start', dateRange.startDate)
    }

    if (dateRange?.endDate) {
        query = query.lte('session_end', dateRange.endDate)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching conversation metrics:', error)
        throw new Error('Failed to fetch conversation metrics')
    }

    const totalSessions = data.length
    const totalMessages = data.reduce((sum, session) => sum + (session.message_count || 0), 0)
    const avgMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0
    const avgDuration = totalSessions > 0
        ? data.reduce((sum, session) => sum + (session.duration_seconds || 0), 0) / totalSessions
        : 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sessionsToday = data.filter(session => {
        const sessionDate = new Date(session.session_start)
        return sessionDate >= today
    }).length

    const byAgentType: Record<string, number> = {}
    data.forEach(session => {
        const agents = session.agent_types?.split(', ') || []
        agents.forEach((agent: string) => {
            byAgentType[agent] = (byAgentType[agent] || 0) + 1
        })
    })

    return {
        totalSessions,
        totalMessages,
        avgMessagesPerSession: Math.round(avgMessagesPerSession * 10) / 10,
        avgDurationMinutes: Math.round((avgDuration / 60) * 10) / 10,
        sessionsToday,
        byAgentType,
        rawData: data
    }
}

/**
 * Export conversation transcript as JSON or text
 */
export async function exportConversationTranscript(sessionId: string, format: 'json' | 'txt' = 'json') {
    const transcript = await getConversationTranscript(sessionId)

    if (format === 'json') {
        return JSON.stringify(transcript, null, 2)
    }

    let text = `Conversation Transcript\n`
    text += `Session ID: ${sessionId}\n`
    text += `Source: ${transcript.source}\n`
    text += `Messages: ${transcript.messages.length}\n`
    text += `\n${'='.repeat(80)}\n\n`

    transcript.messages.forEach((msg, index) => {
        const timestamp = new Date(msg.timestamp).toLocaleString('es-CL')
        text += `[${index + 1}] ${timestamp} - ${msg.role.toUpperCase()}\n`
        if (msg.agentType) {
            text += `Agent: ${msg.agentType}\n`
        }
        text += `${msg.content}\n`

        if ('agentSummary' in msg && msg.agentSummary) {
            text += `Summary: ${msg.agentSummary}\n`
        }
        text += `\n${'-'.repeat(80)}\n\n`
    })

    return text
}
