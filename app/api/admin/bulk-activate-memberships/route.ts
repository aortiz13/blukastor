import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = createServiceClient()

        // Update all memberships: set status to active, started_at to now, expires_at to 3 months from now
        const threeMonthsFromNow = new Date()
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

        const { data, error } = await supabase
            .schema('wa')
            .from('memberships')
            .update({
                status: 'active',
                started_at: new Date().toISOString(),
                expires_at: threeMonthsFromNow.toISOString(),
            })
            .neq('id', '00000000-0000-0000-0000-000000000000') // Match all rows
            .select('id')

        if (error) {
            console.error('Error activating memberships:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            updatedCount: data?.length || 0,
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
