import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxies OpenAI Organization Costs & Usage APIs.
 * Requires env vars:
 *   OPENAI_ADMIN_KEY  — Admin API Key with org read permissions
 *   OPENAI_PROJECT_ID — Project to filter data for (e.g. proj_MYiT4mc9XUL8sDyiWe75Odyx)
 *
 * Costs endpoint: GET https://api.openai.com/v1/organization/costs
 *   Params: start_time, end_time, bucket_width (1d), group_by (project_id|line_item), limit
 *   Auth: Authorization: Bearer <ADMIN_KEY>
 *
 * Usage endpoint: GET https://api.openai.com/v1/organization/usage/completions
 *   Params: start_time, end_time, bucket_width, group_by (model|project_id), limit
 *   Auth: Authorization: Bearer <ADMIN_KEY>
 *
 * GET /api/admin/openai-costs?days=30
 *   Returns: { costs: {...}, usage: {...}, period: {...} }
 */

const OPENAI_BASE = 'https://api.openai.com/v1/organization'

export async function GET(req: NextRequest) {
    const adminKey = process.env.OPENAI_ADMIN_KEY
    if (!adminKey) {
        return NextResponse.json(
            { error: 'OPENAI_ADMIN_KEY not configured' },
            { status: 500 }
        )
    }

    const projectId = process.env.OPENAI_PROJECT_ID || ''

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const now = Math.floor(Date.now() / 1000)
    const startTime = now - days * 86400

    const headers: Record<string, string> = {
        Authorization: `Bearer ${adminKey}`,
        'Content-Type': 'application/json',
    }

    try {
        // ── 1. Fetch Costs ──
        // group_by includes project_id so we can filter server-side + line_item for breakdown
        const costsGroupBy = projectId ? 'project_id,line_item' : 'line_item'
        const costsUrl = `${OPENAI_BASE}/costs?start_time=${startTime}&end_time=${now}&bucket_width=1d&limit=180&group_by=${costsGroupBy}`
        const costsRes = await fetch(costsUrl, { headers, next: { revalidate: 3600 } })

        let costsData: any = null
        if (costsRes.ok) {
            costsData = await costsRes.json()
        } else {
            console.error('OpenAI Costs API error:', costsRes.status, await costsRes.text())
        }

        // ── 2. Fetch Usage/Completions ──
        // group_by includes project_id so we can filter + model for breakdown
        const usageGroupBy = projectId ? 'project_id,model' : 'model'
        const usageUrl = `${OPENAI_BASE}/usage/completions?start_time=${startTime}&bucket_width=1d&limit=180&group_by=${usageGroupBy}`
        const usageRes = await fetch(usageUrl, { headers, next: { revalidate: 3600 } })

        let usageData: any = null
        if (usageRes.ok) {
            usageData = await usageRes.json()
        } else {
            console.error('OpenAI Usage API error:', usageRes.status, await usageRes.text())
        }

        // ── Process Costs into daily series ──
        // Filter results to only include the target project when projectId is set
        const dailyCosts: Record<string, { date: string; total_cents: number; items: Record<string, number> }> = {}

        if (costsData?.data) {
            for (const bucket of costsData.data) {
                const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0]
                if (!dailyCosts[date]) {
                    dailyCosts[date] = { date, total_cents: 0, items: {} }
                }
                for (const result of bucket.results || []) {
                    // Skip results from other projects
                    if (projectId && result.project_id && result.project_id !== projectId) {
                        continue
                    }
                    const amount = result.amount?.value ?? 0 // amount in cents
                    const lineItem = result.line_item || 'other'
                    dailyCosts[date].total_cents += amount
                    dailyCosts[date].items[lineItem] = (dailyCosts[date].items[lineItem] || 0) + amount
                }
            }
        }

        const costsSeries = Object.values(dailyCosts)
            .sort((a, b) => a.date.localeCompare(b.date))

        // ── Process Usage into daily model breakdown ──
        const dailyUsage: Record<string, { date: string; input_tokens: number; output_tokens: number; models: Record<string, { input: number; output: number }> }> = {}

        if (usageData?.data) {
            for (const bucket of usageData.data) {
                const date = new Date(bucket.start_time * 1000).toISOString().split('T')[0]
                if (!dailyUsage[date]) {
                    dailyUsage[date] = { date, input_tokens: 0, output_tokens: 0, models: {} }
                }
                for (const result of bucket.results || []) {
                    // Skip results from other projects
                    if (projectId && result.project_id && result.project_id !== projectId) {
                        continue
                    }
                    const inputTokens = result.input_tokens ?? 0
                    const outputTokens = result.output_tokens ?? 0
                    const model = result.model || 'unknown'
                    dailyUsage[date].input_tokens += inputTokens
                    dailyUsage[date].output_tokens += outputTokens
                    if (!dailyUsage[date].models[model]) {
                        dailyUsage[date].models[model] = { input: 0, output: 0 }
                    }
                    dailyUsage[date].models[model].input += inputTokens
                    dailyUsage[date].models[model].output += outputTokens
                }
            }
        }

        const usageSeries = Object.values(dailyUsage)
            .sort((a, b) => a.date.localeCompare(b.date))

        // ── Compute summaries ──
        const totalCostCents = costsSeries.reduce((s, d) => s + d.total_cents, 0)
        const totalInputTokens = usageSeries.reduce((s, d) => s + d.input_tokens, 0)
        const totalOutputTokens = usageSeries.reduce((s, d) => s + d.output_tokens, 0)

        // Line item totals (for pie chart)
        const lineItemTotals: Record<string, number> = {}
        for (const day of costsSeries) {
            for (const [item, amount] of Object.entries(day.items)) {
                lineItemTotals[item] = (lineItemTotals[item] || 0) + amount
            }
        }

        // Model totals (for usage breakdown)
        const modelTotals: Record<string, { input: number; output: number }> = {}
        for (const day of usageSeries) {
            for (const [model, tokens] of Object.entries(day.models)) {
                if (!modelTotals[model]) modelTotals[model] = { input: 0, output: 0 }
                modelTotals[model].input += tokens.input
                modelTotals[model].output += tokens.output
            }
        }

        return NextResponse.json({
            costs: {
                series: costsSeries,
                totalCostCents,
                totalCostUsd: totalCostCents / 100,
                lineItemTotals,
            },
            usage: {
                series: usageSeries,
                totalInputTokens,
                totalOutputTokens,
                totalTokens: totalInputTokens + totalOutputTokens,
                modelTotals,
            },
            period: { days, startTime, endTime: now },
        })
    } catch (err: any) {
        console.error('OpenAI API proxy error:', err)
        return NextResponse.json(
            { error: err.message || 'Failed to fetch OpenAI data' },
            { status: 500 }
        )
    }
}
