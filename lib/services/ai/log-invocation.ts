import { createClient } from '@/lib/supabase/server'

/**
 * Logs an LLM invocation to the llm_invocations table.
 * Call this after every AI API call in the web app.
 *
 * The Gemini SDK returns usageMetadata on the response:
 *   result.response.usageMetadata?.promptTokenCount
 *   result.response.usageMetadata?.candidatesTokenCount
 *   result.response.usageMetadata?.totalTokenCount
 */

// Pricing per 1K tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'gemini-2.5-pro': { input: 0.00125, output: 0.01 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
}

interface LogLLMInvocationParams {
    companyId: string
    agentType: string
    modelProvider: string
    modelName: string
    inputTokens?: number
    outputTokens?: number
    success: boolean
    errorText?: string
    latencyMs?: number
    contactId?: string
    conversationId?: string
    templateUsed?: string
}

export async function logLLMInvocation(params: LogLLMInvocationParams) {
    try {
        const supabase = await createClient()

        const inputTokens = params.inputTokens || 0
        const outputTokens = params.outputTokens || 0

        // Estimate cost from token counts + pricing
        let estimatedCostUsd = 0
        if (inputTokens > 0 || outputTokens > 0) {
            const pricing = MODEL_PRICING[params.modelName] || { input: 0.001, output: 0.004 }
            estimatedCostUsd = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
        }

        const { error } = await supabase
            .from('llm_invocations')
            .insert({
                company_id: params.companyId,
                agent_type: params.agentType,
                model_provider: params.modelProvider,
                model_name: params.modelName,
                input_tokens: inputTokens,
                output_tokens: outputTokens,
                estimated_cost_usd: estimatedCostUsd,
                success: params.success,
                error_text: params.errorText || null,
                latency_ms: params.latencyMs || null,
                contact_id: params.contactId || null,
                conversation_id: params.conversationId || null,
                template_used: params.templateUsed || null,
                started_at: new Date().toISOString(),
            })

        if (error) {
            console.error('[logLLMInvocation] Insert error:', error.message)
        }
    } catch (err) {
        // Never let logging failures break the main flow
        console.error('[logLLMInvocation] Unexpected error:', err)
    }
}
