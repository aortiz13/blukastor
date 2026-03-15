// ============================================================================
// AI Service Domain Types
// ============================================================================

export interface AIContext {
    contact: any
    userContext: any
    company: any
    companyContext: any
    goals: any[]
    entities: EntityInfo[]
    financialSummary: FinancialSummary | null
    memorySnapshot: any
    recentHistory: any[]
    projectScope: ProjectScope | null
}

export interface EntityInfo {
    entity_id: string
    entity_name: string
    entity_kind: string // 'business' | 'family' | 'project' | 'other'
    relation: string    // 'owner' | 'partner' | 'member'
    verified: boolean
}

export interface FinancialSummary {
    recent_transactions: any[]
    summary_30d_personal: any
    summary_30d_entities: any[]
    has_transactions: boolean
}

export interface ProjectScope {
    id: string
    name: string
    kind: string  // 'business' | 'family' | 'project'
    role?: string // user's role in this project
}

export interface AgentConfig {
    agent_name: string
    personality_traits: Record<string, string> | null
    target_audience: string | null
}

export type AgentType = 'onboarding' | 'goals' | 'business' | 'finance' | 'wellbeing'

// Maps n8n agent_hint values to web app agent types
export const AGENT_HINT_MAP: Record<string, AgentType> = {
    'finance_coach': 'finance',
    'business_coach': 'business',
    'goals': 'goals',
    'default_coach': 'wellbeing',
    'onboarding': 'onboarding',
    'support_human': 'wellbeing', // fallback
}

export interface RouterDecision {
    action: 'respond' | 'route'
    target?: AgentType
    responseText?: string
    decision: string
}

export interface FinanceAgentResponse {
    assistant_reply: string
    intent: string
    confidence: number
    ops: ToolOperation[]
    next_agent_hint?: string | null
    meta: {
        provider: string
        model: string
        tokens_used: number
    }
    _tokenUsage?: {
        inputTokens: number
        outputTokens: number
        latencyMs: number
        modelName: string
        agentType: string
    }
}

export interface ToolOperation {
    op: 'call'
    path: string
    args: Record<string, any>
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
