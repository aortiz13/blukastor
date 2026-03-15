import { SupabaseClient } from '@supabase/supabase-js'
import type { AIContext } from '@/lib/types/ai'

export type { AIContext }

export class MemoryService {
    constructor(private supabase: SupabaseClient) { }

    async fetchContext(contactId: string, companyId: string, projectId?: string): Promise<AIContext> {
        console.log(`Fetching enriched context via RPC for contact: ${contactId}, company: ${companyId}, project: ${projectId || 'none'}`);

        // Try v2 RPC first (enriched), fallback to v1
        const { data, error } = await this.supabase.rpc('get_ai_context_v2', {
            p_contact_id: contactId,
            p_company_id: companyId,
            p_project_id: projectId || null
        });

        if (error) {
            console.warn('get_ai_context_v2 failed, falling back to v1:', error.message);
            return this.fetchContextV1(contactId, companyId);
        }

        console.log('Enriched context fetched via RPC v2 successfully');

        return {
            contact: data.contact || null,
            userContext: data.user_context || null,
            company: data.company || null,
            companyContext: data.company_context || null,
            goals: data.goals || [],
            entities: data.entities || [],
            financialSummary: data.financial_summary || null,
            memorySnapshot: null,
            recentHistory: data.history ? (Array.isArray(data.history) ? data.history.reverse() : []) : [],
            projectScope: data.project_scope || null,
        };
    }

    /** Fallback to original v1 RPC */
    private async fetchContextV1(contactId: string, companyId: string): Promise<AIContext> {
        const { data, error } = await this.supabase.rpc('get_ai_context', {
            p_contact_id: contactId,
            p_company_id: companyId
        });

        if (error) {
            console.error('Error fetching AI context via RPC v1:', error);
            return {
                contact: null,
                userContext: null,
                company: null,
                companyContext: null,
                goals: [],
                entities: [],
                financialSummary: null,
                memorySnapshot: null,
                recentHistory: [],
                projectScope: null,
            };
        }

        return {
            contact: data.contact,
            userContext: data.user_context,
            company: data.company,
            companyContext: null,
            goals: [],
            entities: [],
            financialSummary: null,
            memorySnapshot: null,
            recentHistory: data.history ? data.history.reverse() : [],
            projectScope: null,
        };
    }
}
