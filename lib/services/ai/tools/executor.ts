import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/service';

export class OperationExecutor {
    private serviceClient: ReturnType<typeof createServiceClient>;

    constructor(private supabase: SupabaseClient) {
        this.serviceClient = createServiceClient();
    }

    async execute(ops: any[], contactId: string, companyId: string) {
        for (const op of ops) {
            if (op.op === 'call') {
                const { path, args } = op;
                console.log(`Executor: Executing tool: ${path}`, args);

                try {
                    switch (path) {
                        case 'update_user_context':
                            await this.updateUserContext(contactId, companyId, args);
                            break;
                        case 'update_user_context_rest':
                            await this.updateUserContextRest(contactId, companyId, args);
                            break;
                        case 'update_goals':
                            await this.updateGoals(contactId, companyId, args);
                            break;
                        case 'update_tasks':
                            await this.updateTasks(contactId, companyId, args);
                            break;
                        case 'update_company_context':
                            await this.updateCompanyContext(contactId, companyId, args);
                            break;
                        case 'update_transactions':
                            await this.updateTransactions(contactId, companyId, args);
                            break;
                        case 'update_finance_profile':
                            await this.updateFinanceProfile(contactId, companyId, args);
                            break;
                        case 'invite_member_to_company':
                            await this.inviteMemberToCompany(contactId, companyId, args);
                            break;
                        case 'escalate_to_human':
                            await this.escalateToHuman(contactId, companyId, args);
                            break;
                        default:
                            console.warn(`Executor: Unknown tool path: ${path}`);
                    }
                } catch (e: any) {
                    console.error(`Executor: Error executing ${path}:`, e.message);
                }
            }
        }
    }

    // =========================================================================
    // TOOL HANDLERS
    // =========================================================================

    /** Update basic user context (profile fields + wa.contacts) */
    private async updateUserContext(contactId: string, companyId: string, args: any) {
        // 1. Update wa.contacts profile if applicable
        const contactUpdates: any = {};
        if (args.real_name) contactUpdates.real_name = args.real_name;
        if (args.nickname) contactUpdates.nickname = args.nickname;

        if (args.email) {
            const { data: contact } = await this.supabase.schema('wa').from('contacts').select('notes').eq('id', contactId).single();
            const currentNotes = contact?.notes || '';
            if (!currentNotes.includes(args.email)) {
                contactUpdates.notes = (currentNotes + `\nEmail: ${args.email}`).trim();
            }
        }

        if (Object.keys(contactUpdates).length > 0) {
            console.log('Executor: Updating wa.contacts', contactUpdates);
            const { error } = await this.supabase.schema('wa').from('contacts').update(contactUpdates).eq('id', contactId);
            if (error) console.error('Executor: Error updating wa.contacts', error);
        }

        // 2. Update public.user_context via RPC
        console.log('Executor: Upserting user_context via RPC', args);
        const { error: rpcError } = await this.supabase.rpc('upsert_user_context', {
            p_contact_id: contactId,
            p_company_id: companyId,
            p_profile: args
        });

        if (rpcError) {
            console.error('Executor: Error calling upsert_user_context RPC', rpcError);
        } else {
            console.log('Executor: user_context updated successfully');
        }
    }

    /** Update extended user context JSONB fields (personal_finance, agent_hint, etc.) */
    private async updateUserContextRest(contactId: string, companyId: string, args: any) {
        console.log('Executor: update_user_context_rest', args);

        // Build the update object with JSONB merge
        const updates: any = {};

        // Handle JSONB fields with merge
        const jsonbFields = ['personal_finance', 'business_context', 'personal_dev', 'wellbeing'];
        for (const field of jsonbFields) {
            if (args[field]) {
                updates[field] = args[field];
            }
        }

        // Handle agent_hint (simple string field)
        if (args.agent_hint !== undefined) {
            updates.agent_hint = args.agent_hint;
        }

        if (Object.keys(updates).length === 0) return;

        // Use service client for JSONB merge update
        const { data: existing } = await this.serviceClient
            .from('user_context')
            .select('personal_finance, business_context, personal_dev, wellbeing, agent_hint')
            .eq('contact_id', contactId)
            .eq('context_company_id', companyId)
            .single();

        if (existing) {
            // Merge JSONB fields
            const merged: any = {};
            if (updates.personal_finance) {
                merged.personal_finance = { ...(existing.personal_finance || {}), ...updates.personal_finance };
            }
            if (updates.business_context) {
                merged.business_context = { ...(existing.business_context || {}), ...updates.business_context };
            }
            if (updates.personal_dev) {
                merged.personal_dev = { ...(existing.personal_dev || {}), ...updates.personal_dev };
            }
            if (updates.wellbeing) {
                merged.wellbeing = { ...(existing.wellbeing || {}), ...updates.wellbeing };
            }
            if (updates.agent_hint !== undefined) {
                merged.agent_hint = updates.agent_hint;
            }

            const { error } = await this.serviceClient
                .from('user_context')
                .update(merged)
                .eq('contact_id', contactId)
                .eq('context_company_id', companyId);

            if (error) {
                console.error('Executor: Error updating user_context_rest:', error);
            } else {
                console.log('Executor: user_context_rest updated successfully');
            }
        } else {
            // Insert new record
            const { error } = await this.serviceClient
                .from('user_context')
                .insert({
                    contact_id: contactId,
                    context_company_id: companyId,
                    ...updates,
                });

            if (error) {
                console.error('Executor: Error inserting user_context_rest:', error);
            }
        }
    }

    /** Create or update a goal */
    private async updateGoals(contactId: string, companyId: string, args: any) {
        console.log('Executor: update_goals', args);

        const goalData: any = {
            contact_id: contactId,
            context_company_id: companyId,
            title: args.title,
            scope: args.scope || 'personal',
            status: args.status || 'active',
            priority: args.priority || 'medium',
        };

        if (args.deadline) goalData.deadline = args.deadline;
        if (args.description) goalData.description = args.description;
        if (args.target) goalData.target = args.target;
        if (args.krs) goalData.key_results = args.krs;

        // If scope is company, set company-specific fields
        if (args.scope === 'company') {
            if (args.user_company_id) goalData.user_company_id = args.user_company_id;
            if (args.user_company_name) goalData.user_company_name = args.user_company_name;
            if (args.company_kind) goalData.company_kind = args.company_kind;
        }

        // If goal_id exists, update; otherwise insert
        if (args.goal_id) {
            const { error } = await this.serviceClient
                .from('goals')
                .update(goalData)
                .eq('id', args.goal_id);

            if (error) {
                console.error('Executor: Error updating goal:', error);
            } else {
                console.log('Executor: Goal updated:', args.goal_id);
            }
        } else {
            const { data, error } = await this.serviceClient
                .from('goals')
                .insert(goalData)
                .select('id')
                .single();

            if (error) {
                console.error('Executor: Error creating goal:', error);
            } else {
                console.log('Executor: Goal created:', data?.id);
            }
        }
    }

    /** Create or update a task */
    private async updateTasks(contactId: string, companyId: string, args: any) {
        console.log('Executor: update_tasks', args);

        const taskData: any = {
            contact_id: contactId,
            context_company_id: companyId,
            title: args.title,
            scope: args.scope || 'personal',
            status: args.status || 'pending',
            priority: args.priority || 'medium',
        };

        if (args.goal_id) taskData.goal_id = args.goal_id;
        if (args.deadline) taskData.deadline = args.deadline;
        if (args.description) taskData.description = args.description;
        if (args.completion_data) taskData.completion_data = args.completion_data;

        // If scope is company, set company-specific fields
        if (args.scope === 'company') {
            if (args.user_company_id) taskData.user_company_id = args.user_company_id;
            if (args.user_company_name) taskData.user_company_name = args.user_company_name;
            if (args.company_kind) taskData.company_kind = args.company_kind;
        }

        if (args.task_id) {
            const { error } = await this.serviceClient
                .from('tasks')
                .update(taskData)
                .eq('id', args.task_id);

            if (error) {
                console.error('Executor: Error updating task:', error);
            } else {
                console.log('Executor: Task updated:', args.task_id);
            }
        } else {
            const { data, error } = await this.serviceClient
                .from('tasks')
                .insert(taskData)
                .select('id')
                .single();

            if (error) {
                console.error('Executor: Error creating task:', error);
            } else {
                console.log('Executor: Task created:', data?.id);
            }
        }
    }

    /** Update company context (financial_plan, goals_okrs, etc.) */
    private async updateCompanyContext(contactId: string, companyId: string, args: any) {
        console.log('Executor: update_company_context', args);

        // Determine which company to update
        const targetCompanyId = args.user_company_id || companyId;

        // Check if company_context exists
        const { data: existing } = await this.serviceClient
            .from('company_context')
            .select('id, financial_plan, goals_okrs')
            .eq('company_id', targetCompanyId)
            .single();

        const updates: any = {};
        if (args.financial_plan) {
            updates.financial_plan = existing?.financial_plan
                ? { ...existing.financial_plan, ...args.financial_plan }
                : args.financial_plan;
        }
        if (args.goals_okrs) {
            updates.goals_okrs = existing?.goals_okrs
                ? { ...existing.goals_okrs, ...args.goals_okrs }
                : args.goals_okrs;
        }
        if (args.goals_defined !== undefined) updates.goals_defined = args.goals_defined;
        if (args.industry) updates.industry = args.industry;
        if (args.primary_region) updates.primary_region = args.primary_region;

        if (existing) {
            const { error } = await this.serviceClient
                .from('company_context')
                .update(updates)
                .eq('company_id', targetCompanyId);

            if (error) console.error('Executor: Error updating company_context:', error);
            else console.log('Executor: company_context updated for:', targetCompanyId);
        } else {
            const { error } = await this.serviceClient
                .from('company_context')
                .insert({ company_id: targetCompanyId, ...updates });

            if (error) console.error('Executor: Error inserting company_context:', error);
            else console.log('Executor: company_context created for:', targetCompanyId);
        }
    }

    /** Insert a financial transaction */
    private async updateTransactions(contactId: string, companyId: string, args: any) {
        console.log('Executor: update_transactions', args);

        const txData: any = {
            contact_id: contactId,
            context_company_id: companyId,
            transaction_type: args.transaction_type,
            amount: args.amount,
            date: args.date || new Date().toISOString().split('T')[0],
            scope: args.scope || 'personal',
            status: 'confirmed',
        };

        if (args.category) txData.category = args.category;
        if (args.description) txData.description = args.description;
        if (args.payment_method) txData.payment_method = args.payment_method;
        if (args.notes) txData.notes = args.notes;

        // Company-scoped fields
        if (args.scope === 'company') {
            if (args.user_company_id) txData.user_company_id = args.user_company_id;
            if (args.user_company_name) txData.user_company_name = args.user_company_name;
            if (args.user_company_kind) txData.user_company_kind = args.user_company_kind;
        }

        const { data, error } = await this.serviceClient
            .from('financial_transactions')
            .insert(txData)
            .select('id')
            .single();

        if (error) {
            console.error('Executor: Error creating transaction:', error);
        } else {
            console.log('Executor: Transaction created:', data?.id);
        }
    }

    /** Update personal finance profile */
    private async updateFinanceProfile(contactId: string, companyId: string, args: any) {
        console.log('Executor: update_finance_profile', args);

        // This is a specialized version of update_user_context_rest for personal_finance
        await this.updateUserContextRest(contactId, companyId, {
            personal_finance: args,
        });
    }

    /** Invite a member to a company/project/family */
    private async inviteMemberToCompany(contactId: string, companyId: string, args: any) {
        console.log('Executor: invite_member_to_company', args);

        const targetCompanyId = args.user_company_id || companyId;

        const linkData: any = {
            contact_id: null, // Will be resolved when they accept
            company_id: targetCompanyId,
            company_kind: args.company_kind || 'business',
            relation: args.relation || 'member',
            verified: false,
            invited_by: contactId,
        };

        // Store invitation metadata
        if (args.invitee_name) linkData.invitee_name = args.invitee_name;
        if (args.invitee_identifier) linkData.invitee_identifier = args.invitee_identifier;
        if (args.invitation_message) linkData.invitation_message = args.invitation_message;

        console.log('Executor: Invitation data prepared (actual invite flow TBD):', linkData);
        // Note: The full invitation flow (email/WhatsApp) would be handled by a separate service.
        // For now, we log the invitation intent. The actual invite mechanism will be connected later.
    }

    /** Escalate to human support */
    private async escalateToHuman(contactId: string, companyId: string, args: any) {
        console.log('Executor: escalate_to_human', {
            contactId,
            companyId,
            reason: args.reason || 'User requested human support',
            severity: args.severity || 'medium',
        });
        // Placeholder: In production, this would notify a human agent via Slack, email, etc.
    }
}
