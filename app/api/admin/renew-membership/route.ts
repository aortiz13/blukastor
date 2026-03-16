import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { membershipId } = await request.json()

        if (!membershipId) {
            return NextResponse.json({ error: 'membershipId is required' }, { status: 400 })
        }

        const supabase = createServiceClient()

        const { error } = await supabase.rpc('exec_sql_void', {
            sql_query: `UPDATE wa.memberships SET status = 'active', started_at = now(), expires_at = now() + interval '3 months' WHERE id = '${membershipId}'`
        })

        if (error) {
            console.error('Error renewing membership:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const threeMonthsFromNow = new Date()
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

        return NextResponse.json({
            success: true,
            expiresAt: threeMonthsFromNow.toISOString(),
        })
    } catch (err: any) {
        console.error('Renew membership error:', err)
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
