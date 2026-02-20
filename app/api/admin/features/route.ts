import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Check if user is super admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminCheck } = await supabase
            .from('admin_profiles')
            .select('role, scope')
            .eq('auth_user_id', user.id)
            .single()

        if (adminCheck) {
            console.log('Admin check passed:', adminCheck)
        } else {
            console.log('Admin check failed for user:', user.id)
        }

        if (!adminCheck || (adminCheck.scope !== 'global' && adminCheck.role !== 'super_admin')) {
            console.log('Forbidden: Insufficient privileges')
            return NextResponse.json({ error: 'Forbidden: Super admin privileges required' }, { status: 403 })
        }

        // Parse request body
        const body = await request.json()
        const { company_id, feature_key, enabled } = body

        console.log('Toggling feature:', { company_id, feature_key, enabled })

        // Validate required fields
        if (!company_id || !feature_key || enabled === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Upsert feature toggle
        const { data, error } = await supabase
            .from('instance_features')
            .upsert({
                client_company_id: company_id,
                feature_key,
                enabled,
            }, {
                onConflict: 'client_company_id, feature_key'
            })
            .select()
            .single()

        if (error) {
            console.error('Error inupsert instance_features:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const DEFAULT_AGENTS: Record<string, { name: string, message: string }> = {
            'onboarding': {
                name: 'Nova Onboarding',
                message: 'You are Nova, an expert onboarding specialist dedicated to helping new users get started with Blukastor. Your goal is to guide them through the initial setup, explain key features, and ensure they feel comfortable using the platform.'
            },
            'finance': {
                name: 'Nova Finance',
                message: 'You are Nova, a financial advisor specializing in personal and small business finance. You verify data accuracy, help users organize their income and expenses, and provide insights to improve financial health.'
            },
            'goals': {
                name: 'Nova Goals',
                message: 'You are Nova, a strategic goal setting coach. You help users define clear, achievable objectives, break them down into actionable steps (KPIs), and keep them motivated to reach their targets.'
            },
            'business': {
                name: 'Nova Business',
                message: 'You are Nova, a business development consultant. You assist entrepreneurs in identifying opportunities, optimizing operations, and scaling their ventures effectively.'
            }
        }

        // Sync with company_prompts if it's an agent feature
        if (feature_key.startsWith('agent:')) {
            const agentType = feature_key.replace('agent:', '')
            console.log(`Syncing agent ${agentType} status to ${enabled}`)

            if (enabled) {
                // Auto-provision: Create or update (activate)
                const defaults = DEFAULT_AGENTS[agentType] || {
                    name: `Nova ${agentType.charAt(0).toUpperCase() + agentType.slice(1)}`,
                    message: 'You are a helpful assistant.'
                }

                console.log(`[Auto-Provision] Creating/Updating agent '${agentType}' for TARGET Company ID: ${company_id}`)

                const { error: agentError } = await supabase
                    .from('company_prompts')
                    .upsert({
                        company_id: company_id, // Explicitly using the ID from the request body
                        agent_type: agentType,
                        agent_name: defaults.name,
                        system_message: defaults.message,
                        active: true,
                        version: 1
                    }, {
                        onConflict: 'company_id, agent_type'
                    })

                if (agentError) {
                    console.error('Error auto-provisioning agent:', agentError)
                }
            } else {
                // Deactivate only
                const { error: agentError } = await supabase
                    .from('company_prompts')
                    .update({ active: false })
                    .eq('company_id', company_id)
                    .eq('agent_type', agentType)

                if (agentError) {
                    console.error('Error deactivating agent:', agentError)
                }
            }
        }

        return NextResponse.json({
            success: true,
            feature: data,
        })
    } catch (error: any) {
        console.error('Error in POST /api/admin/features:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get company_id from query params
        const { searchParams } = new URL(request.url)
        const companyId = searchParams.get('company_id')

        if (!companyId) {
            return NextResponse.json({ error: 'Missing company_id parameter' }, { status: 400 })
        }

        // Fetch features
        const { data: features, error } = await supabase
            .from('instance_features')
            .select('*')
            .eq('client_company_id', companyId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ features })
    } catch (error: any) {
        console.error('Error in GET /api/admin/features:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
