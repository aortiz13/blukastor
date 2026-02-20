import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/ai-costs-by-company?days=30
 *
 * Returns per-client-company AI usage from llm_invocations:
 *   - summary: array of per-company aggregates
 *   - dailySeries: daily invocation counts per company
 */

// Pricing per 1K tokens (USD) for cost estimation
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
    'gemini-2.5-pro': { input: 0.00125, output: 0.01 },
    'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
    'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'deterministic_js': { input: 0, output: 0 },
}

// Fallback average cost per invocation when tokens aren't logged
const FALLBACK_COST_PER_INVOCATION: Record<string, number> = {
    'gemini-2.5-pro': 0.02,
    'gemini-2.0-flash': 0.001,
    'gemini-1.5-flash': 0.0005,
    'gpt-4o': 0.03,
    'gpt-4o-mini': 0.002,
    'deterministic_js': 0,
    'unknown_model': 0.005,
}

export async function GET(req: NextRequest) {
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const filterCompanyId = searchParams.get('company_id') || null

    const startDate = new Date(Date.now() - days * 86400 * 1000).toISOString()

    try {
        // Fetch all invocations within range
        let query = supabase
            .from('llm_invocations')
            .select('invocation_id, company_id, agent_type, model_provider, model_name, started_at, finished_at, success, latency_ms, input_tokens, output_tokens, estimated_cost_usd')
            .gte('started_at', startDate)
            .order('started_at', { ascending: true })
            .limit(5000)

        if (filterCompanyId) {
            query = query.eq('company_id', filterCompanyId)
        }

        const { data: invocations, error: invError } = await query

        if (invError) {
            console.error('Error fetching llm_invocations:', invError)
            return NextResponse.json({ error: invError.message }, { status: 500 })
        }

        // Fetch client companies for name mapping
        const { data: companies } = await supabase
            .from('client_companies')
            .select('id, name')
            .eq('is_active', true)

        const companyNames: Record<string, string> = {}
        for (const c of companies || []) {
            companyNames[c.id] = c.name
        }

        // ── Aggregate per company ──
        const companyMap: Record<string, {
            company_id: string
            company_name: string
            total_invocations: number
            successful: number
            total_input_tokens: number
            total_output_tokens: number
            estimated_cost_usd: number
            avg_latency_ms: number
            latency_sum: number
            latency_count: number
            models: Record<string, number>
            agents: Record<string, number>
        }> = {}

        const dailyMap: Record<string, Record<string, number>> = {} // date -> company_id -> count

        for (const inv of invocations || []) {
            const cid = inv.company_id || 'unknown'
            const cname = companyNames[cid] || cid

            if (!companyMap[cid]) {
                companyMap[cid] = {
                    company_id: cid,
                    company_name: cname,
                    total_invocations: 0,
                    successful: 0,
                    total_input_tokens: 0,
                    total_output_tokens: 0,
                    estimated_cost_usd: 0,
                    avg_latency_ms: 0,
                    latency_sum: 0,
                    latency_count: 0,
                    models: {},
                    agents: {},
                }
            }

            const entry = companyMap[cid]
            entry.total_invocations++
            if (inv.success) entry.successful++

            const inputTokens = inv.input_tokens || 0
            const outputTokens = inv.output_tokens || 0
            entry.total_input_tokens += inputTokens
            entry.total_output_tokens += outputTokens

            // Cost estimation
            if (inv.estimated_cost_usd && inv.estimated_cost_usd > 0) {
                entry.estimated_cost_usd += inv.estimated_cost_usd
            } else if (inputTokens > 0 || outputTokens > 0) {
                // Compute from tokens + pricing table
                const pricing = MODEL_PRICING[inv.model_name] || { input: 0.001, output: 0.004 }
                entry.estimated_cost_usd += (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
            } else {
                // Fallback: estimate from invocation count
                const fallback = FALLBACK_COST_PER_INVOCATION[inv.model_name] || 0.005
                entry.estimated_cost_usd += fallback
            }

            if (inv.latency_ms) {
                entry.latency_sum += inv.latency_ms
                entry.latency_count++
            }

            const model = inv.model_name || 'unknown'
            entry.models[model] = (entry.models[model] || 0) + 1

            const agent = inv.agent_type || 'unknown'
            entry.agents[agent] = (entry.agents[agent] || 0) + 1

            // Daily series
            const date = new Date(inv.started_at).toISOString().split('T')[0]
            if (!dailyMap[date]) dailyMap[date] = {}
            dailyMap[date][cid] = (dailyMap[date][cid] || 0) + 1
        }

        // Finalize averages
        const summary = Object.values(companyMap).map(entry => ({
            company_id: entry.company_id,
            company_name: entry.company_name,
            total_invocations: entry.total_invocations,
            success_rate: entry.total_invocations > 0
                ? Math.round((entry.successful / entry.total_invocations) * 100)
                : 0,
            total_input_tokens: entry.total_input_tokens,
            total_output_tokens: entry.total_output_tokens,
            total_tokens: entry.total_input_tokens + entry.total_output_tokens,
            estimated_cost_usd: Math.round(entry.estimated_cost_usd * 10000) / 10000,
            avg_latency_ms: entry.latency_count > 0
                ? Math.round(entry.latency_sum / entry.latency_count)
                : 0,
            models: entry.models,
            agents: entry.agents,
        })).sort((a, b) => b.estimated_cost_usd - a.estimated_cost_usd)

        // Build daily series for chart
        const allCompanyIds = Object.keys(companyMap)
        const dailySeries = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, counts]) => {
                const row: Record<string, any> = { date }
                for (const cid of allCompanyIds) {
                    row[companyNames[cid] || cid] = counts[cid] || 0
                }
                return row
            })

        return NextResponse.json({
            summary,
            dailySeries,
            companies: (companies || []).map(c => ({
                id: c.id,
                name: c.name
            })).sort((a, b) => a.name.localeCompare(b.name)),
            period: { days, startDate },
        })
    } catch (err: any) {
        console.error('AI costs by company error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to fetch AI costs' },
            { status: 500 }
        )
    }
}
