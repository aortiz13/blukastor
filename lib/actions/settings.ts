'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

export async function updateCompanySettings(companyId: string, data: { currency?: string; locale?: string }) {
    const adminDb = createServiceClient()

    const updateData: Record<string, string> = {}
    if (data.currency) updateData.currency = data.currency
    if (data.locale) updateData.locale = data.locale

    if (Object.keys(updateData).length === 0) {
        return { error: 'No data to update' }
    }

    const { error } = await adminDb
        .from('companies')
        .update(updateData)
        .eq('id', companyId)

    if (error) {
        console.error('Error updating company settings:', error)
        return { error: 'Failed to update settings' }
    }

    revalidatePath('/settings')
    revalidatePath('/finance') // Revalidate finance dashboard too
    return { success: true }
}
