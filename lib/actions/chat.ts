'use server'

import { OrchestratorService } from '@/lib/services/ai/orchestrator'

export async function processAIChatMessage(contactId: string, companyId: string, message: string, agentId?: string, mediaUrl?: string, projectId?: string) {
    console.log('Action processAIChatMessage called', { contactId, companyId, messageLength: message.length, agentId, hasMedia: !!mediaUrl, projectId: projectId || 'none' });
    try {
        const orchestrator = new OrchestratorService();
        const result = await orchestrator.processMessage(contactId, companyId, message, undefined, agentId, mediaUrl, projectId);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('AI Processing Error:', error);
        return { success: false, error: error.message };
    }
}
