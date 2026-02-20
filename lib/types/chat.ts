// ============================================================================
// Chat Domain Types
// ============================================================================

export interface MessageMedia {
    type: 'image' | 'audio' | 'file'
    url: string
    mime_type?: string
    file_name?: string
    file_size?: number
    duration?: number
}


export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    created_at: string
    agent_type?: string
    media?: MessageMedia | null
}

export interface Agent {
    id: string
    agent_name: string
    system_message: string
    agent_type: string
    description?: string
    active?: boolean
}
