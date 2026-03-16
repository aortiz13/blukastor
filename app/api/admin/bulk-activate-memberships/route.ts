import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST() {
    try {
        const supabase = createServiceClient()

        // Call the tested database function that updates all active memberships
        const { data, error } = await supabase.rpc('bulk_activate_memberships_3months')

        if (error) {
            console.error('Error activating memberships:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        const threeMonthsFromNow = new Date()
        threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

        return NextResponse.json({
            success: true,
            updatedCount: data ?? 0,
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
