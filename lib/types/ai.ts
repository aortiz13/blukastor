// ============================================================================
// AI Service Domain Types
// ============================================================================

export interface AIContext {
    contact: any
    userContext: any
    company: any
    companyContext: any
    goals: any[]
    memorySnapshot: any
    recentHistory: any[]
}

export type AgentType = 'onboarding' | 'goals' | 'business' | 'finance' | 'default'

export interface RouterDecision {
    action: 'respond' | 'route'
    target?: AgentType
    responseText?: string
    decision: string
}

export interface GeminiResponse {
    assistant_reply: string
    intent: string
    confidence: number
    ops: any[]
    next_agent_hint?: string | null
    meta: {
        provider: string
        model: string
        tokens_used: number
    }
}
