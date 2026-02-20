'use server'

import { OrchestratorService } from '@/lib/services/ai/orchestrator'

export async function processAIChatMessage(contactId: string, companyId: string, message: string, agentId?: string, mediaUrl?: string) {
    console.log('Action processAIChatMessage called', { contactId, companyId, messageLength: message.length, agentId, hasMedia: !!mediaUrl });
    try {
        const orchestrator = new OrchestratorService();
        // agentId is treated as the forceAgent parameter
        // Pass mediaUrl to processMessage (it was expecting mediaData object before, but we are simplifying to URL for Edge Function)
        // We need to check Orchestrator signature next, but for now let's pass it.
        // Actually, looking at Orchestrator, it expects `mediaData: { type, base64, mime }`.
        // We should probably change Orchestrator to accept URL too, or just pass it as a separate param.
        // Let's pass it as a new param `mediaUrl` to avoid breaking existing `mediaData` usage (if any).

        const result = await orchestrator.processMessage(contactId, companyId, message, undefined, agentId, mediaUrl);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('AI Processing Error:', error);
        return { success: false, error: error.message };
    }
}
