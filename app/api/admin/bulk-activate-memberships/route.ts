import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = createServiceClient()

        // Calculate 3 months from now
        const threeMonthsFromNow = new Date()
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

        // Use exec_sql_void RPC to update wa.memberships directly
        // (PostgREST only exposes public/graphql_public schemas)
        const { error: updateError } = await supabase.rpc('exec_sql_void', {
            sql: `UPDATE wa.memberships SET status = 'active', started_at = now(), expires_at = now() + interval '3 months'`
        })

        if (updateError) {
            console.error('Error activating memberships:', updateError)
            return NextResponse.json(
                { error: updateError.message },
                { status: 500 }
            )
        }

        // Get the count of updated memberships
        const { count } = await supabase
            .from('membership_status_v2')
            .select('*', { count: 'exact', head: true })

        return NextResponse.json({
            success: true,
            updatedCount: count ?? 0,
            expiresAt: threeMonthsFromNow.toISOString(),
        })
    } catch (err: any) {
        console.error('Bulk activate error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
