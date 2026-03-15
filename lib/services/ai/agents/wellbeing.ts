import { GoogleGenerativeAI } from "@google/generative-ai"
import { PromptBuilder } from '../prompt-builder'
import type { AIContext, AgentConfig, FinanceAgentResponse } from '@/lib/types/ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export class WellbeingAgent {
    private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
    private promptBuilder = new PromptBuilder()

    async execute(
        message: string,
        context: AIContext,
        agentConfig?: AgentConfig | null,
        mediaUrl?: string
    ): Promise<FinanceAgentResponse & { _tokenUsage?: any }> {
        const startTime = Date.now()

        // 1. Build dynamic system prompt
        const now = new Date()
        const systemPrompt = this.promptBuilder.buildWellbeingPrompt({
            companyName: context.company?.name || context.company?.company_name || 'Personalized Coach',
            agentConfig: agentConfig || null,
            projectScope: context.projectScope || null,
            currentDate: now.toISOString().split('T')[0],
            currentTime: now.toISOString().split('T')[1].substring(0, 5),
        })

        // 2. Build context payload
        const contextPayload = this.promptBuilder.buildContextPayload(context)

        // 3. Build user message with context
        const userPrompt = `${contextPayload}\n\n---\n\nMensaje del Usuario:\n"${message}"`

        // 4. Call Gemini with JSON mode
        try {
            console.log('WellbeingAgent: GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY)
            console.log('WellbeingAgent: System prompt length:', systemPrompt.length)
            console.log('WellbeingAgent: Calling Gemini...')

            const result = await this.model.generateContent({
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
                systemInstruction: systemPrompt,
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.3,
                }
            })

            const usage = result.response.usageMetadata
            const latencyMs = Date.now() - startTime
            const responseText = result.response.text()

            // 5. Parse JSON response
            const parsed = JSON.parse(responseText) as FinanceAgentResponse

            // Ensure required fields
            parsed.intent = parsed.intent || 'bienestar_habitos'
            parsed.ops = parsed.ops || []
            parsed.confidence = parsed.confidence || 1.0
            parsed.next_agent_hint = parsed.next_agent_hint || null

            // Add token usage metadata
            parsed._tokenUsage = {
                inputTokens: usage?.promptTokenCount || 0,
                outputTokens: usage?.candidatesTokenCount || 0,
                latencyMs,
                modelName: 'gemini-2.0-flash',
                agentType: 'wellbeing',
            }

            return parsed

        } catch (e: any) {
            console.error("WellbeingAgent: Error processing message", e?.message, e?.stack?.substring(0, 500))
            const latencyMs = Date.now() - startTime
            const errorDetail = e?.message || 'Unknown error'

            return {
                assistant_reply: `[DEBUG] Error en WellbeingAgent: ${errorDetail}. ¿Podrías intentar de nuevo? 🌟`,
                intent: "bienestar_habitos",
                confidence: 0,
                ops: [],
                next_agent_hint: 'default_coach',
                meta: { provider: 'llm', model: 'gemini-2.0-flash', tokens_used: 0 },
                _tokenUsage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    latencyMs,
                    modelName: 'gemini-2.0-flash',
                    agentType: 'wellbeing',
                },
            }
        }
    }
}
