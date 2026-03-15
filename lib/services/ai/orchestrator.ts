import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { MemoryService } from './memory';
import { RouterService } from './router';
import { OnboardingAgent } from './agents/onboarding';
import { GoalsAgent } from './agents/goals';
import { BusinessAgent } from './agents/business';
import { FinanceAgent } from './agents/finance';
import { WellbeingAgent } from './agents/wellbeing';
import { MultimodalService } from './multimodal';
import { OperationExecutor } from './tools/executor';
import { logLLMInvocation } from './log-invocation';
import type { AgentConfig } from '@/lib/types/ai';
import { AGENT_HINT_MAP } from '@/lib/types/ai';

export class OrchestratorService {
    constructor(private supabaseClient?: any) { }

    async processMessage(
        contactId: string,
        companyId: string,
        message: string,
        mediaData?: { type: string, base64: string, mime: string },
        forceAgent?: string,
        mediaUrl?: string,
        projectId?: string
    ) {
        const supabase = this.supabaseClient || await createClient();
        const memory = new MemoryService(supabase);
        const router = new RouterService();
        const multimodal = new MultimodalService();
        const executor = new OperationExecutor(supabase);

        let multimodalContext = null;
        let enhancedMessage = message;

        // 0. Prefetch Multimodal Context if media exists (Legacy Base64 path)
        if (mediaData) {
            console.log('Orchestrator: Processing media with MultimodalService...');
            multimodalContext = await multimodal.processMedia(mediaData.type, mediaData.base64, mediaData.mime);
            console.log('Orchestrator: Multimodal context captured:', multimodalContext);

            // Log multimodal invocation
            if (multimodalContext._tokenUsage) {
                const tu = multimodalContext._tokenUsage;
                logLLMInvocation({
                    companyId,
                    agentType: tu.agentType || `multimodal:${mediaData.type}`,
                    modelProvider: 'google',
                    modelName: tu.modelName || 'gemini-2.0-flash',
                    inputTokens: tu.inputTokens,
                    outputTokens: tu.outputTokens,
                    success: true,
                    latencyMs: tu.latencyMs,
                    contactId,
                }).catch(() => { });
            }

            if (multimodalContext.transcript) {
                enhancedMessage = `${message}\n[Voice Transcript]: ${multimodalContext.transcript}`;
            } else if (multimodalContext.extraction) {
                enhancedMessage = `${message}\n[Image Extraction]: ${JSON.stringify(multimodalContext.extraction)}`;
            }
        }

        // 1. Fetch Context (enriched, with optional project scope)
        console.log('Orchestrator: Fetching context...');
        const context = await memory.fetchContext(contactId, companyId, projectId);

        // 1.5. Fetch Agent Config from company_prompts (dynamic personalization)
        let agentConfigs: Record<string, AgentConfig> = {};
        try {
            const serviceClient = createServiceClient();
            // Resolve the tenant ID (parent company for projects)
            let agentSourceId = companyId;
            const { data: projectRow } = await serviceClient
                .from('companies')
                .select('client_company_id')
                .eq('id', companyId)
                .single();
            if (projectRow?.client_company_id) {
                agentSourceId = projectRow.client_company_id;
            }

            const { data: prompts } = await serviceClient
                .from('company_prompts')
                .select('agent_type, agent_name, personality_traits, target_audience')
                .eq('company_id', agentSourceId)
                .eq('active', true);

            if (prompts) {
                for (const p of prompts) {
                    agentConfigs[p.agent_type] = {
                        agent_name: p.agent_name || 'Nova',
                        personality_traits: p.personality_traits,
                        target_audience: p.target_audience,
                    };
                }
            }
        } catch (e) {
            console.warn('Orchestrator: Error fetching agent configs:', e);
        }

        // 2. Decide Action (Heuristic Router)
        let decision;
        if (forceAgent) {
            console.log(`Orchestrator: Forced routing to agent: ${forceAgent}`);
            decision = { action: 'route', target: forceAgent };
        } else {
            console.log('Orchestrator: Deciding action...');
            decision = await router.decide(enhancedMessage, context);

            // Force routing if multimodal suggested an intent
            if (multimodalContext?.intent_hint) {
                decision.target = multimodalContext.intent_hint;
            }
        }
        console.log('Orchestrator decision:', decision);

        if (decision.action === 'respond') {
            const responseText = decision.responseText || 'Hola, ¿en qué puedo ayudarte?';
            console.log('Orchestrator: Direct response:', responseText);
            await this.saveMessageToHistory(supabase, contactId, companyId, message, responseText);
            return { assistant_reply: responseText };
        }

        console.log('Orchestrator: Routing to agent:', decision.target);
        // 3. Route to specialized Agent
        let agentResponse;
        const targetAgent = decision.target as string;

        switch (targetAgent) {
            case 'onboarding':
                agentResponse = await new OnboardingAgent().execute(message, context);
                break;
            case 'goals':
                agentResponse = await new GoalsAgent().execute(message, context);
                break;
            case 'business':
                agentResponse = await new BusinessAgent().execute(message, context);
                break;
            case 'finance':
                // Finance agent gets agentConfig + project scope
                agentResponse = await new FinanceAgent().execute(
                    message,
                    context,
                    agentConfigs['finance'] || null,
                    mediaUrl
                );
                break;
            case 'wellbeing':
                // Wellbeing agent gets agentConfig + project scope
                agentResponse = await new WellbeingAgent().execute(
                    message,
                    context,
                    agentConfigs['wellbeing'] || agentConfigs['default'] || null,
                    mediaUrl
                );
                break;
            default:
                // Fallback to wellbeing (default coach)
                agentResponse = await new WellbeingAgent().execute(
                    message,
                    context,
                    agentConfigs['wellbeing'] || agentConfigs['default'] || null,
                    mediaUrl
                );
        }

        console.log('Agent response received:', agentResponse.assistant_reply);

        // 3.5. Log LLM invocation with token counts
        if (agentResponse._tokenUsage) {
            const tu = agentResponse._tokenUsage;
            logLLMInvocation({
                companyId,
                agentType: tu.agentType || decision.target || 'unknown',
                modelProvider: 'google',
                modelName: tu.modelName || 'gemini-2.0-flash',
                inputTokens: tu.inputTokens,
                outputTokens: tu.outputTokens,
                success: true,
                latencyMs: tu.latencyMs,
                contactId,
            }).catch(() => { }); // Fire-and-forget, never block
        }

        // 4. Handle Ops (Tools)
        if (agentResponse.ops && agentResponse.ops.length > 0) {
            console.log('Orchestrator: Executing ops:', agentResponse.ops.length);
            await executor.execute(agentResponse.ops, contactId, companyId);
        }

        // 4.5. Handle next_agent_hint (update agent routing for next message)
        if (agentResponse.next_agent_hint) {
            try {
                const hintValue = agentResponse.next_agent_hint;
                console.log('Orchestrator: Setting next_agent_hint:', hintValue);

                const serviceClient = createServiceClient();
                await serviceClient
                    .from('user_context')
                    .update({ agent_hint: hintValue })
                    .eq('contact_id', contactId);
            } catch (e) {
                console.warn('Orchestrator: Error setting agent_hint:', e);
            }
        }

        // 5. Save To Memory (Chat History)
        await this.saveMessageToHistory(supabase, contactId, companyId, message, agentResponse.assistant_reply, agentResponse);

        return agentResponse;
    }

    private async saveMessageToHistory(supabase: any, contactId: string, companyId: string, userMessage: string, assistantReply: string, meta?: any) {
        console.log('Orchestrator: Saving history via RPC...');
        try {
            const { error } = await supabase.rpc('save_ai_chat_message', {
                p_contact_id: contactId,
                p_company_id: companyId,
                p_user_message: userMessage,
                p_assistant_reply: assistantReply,
                p_metadata: meta || {},
                p_agent_type: meta?.intent || 'onboarding'
            });

            if (error) throw error;
            console.log('Orchestrator: History saved successfully via RPC');
        } catch (e) {
            console.error('Orchestrator: Error saving history:', e);
        }
    }
}
