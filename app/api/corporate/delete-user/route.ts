import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Resolve admin's company
        const { data: admins } = await supabase
            .from('admin_profiles')
            .select('company_id, role, scope')
            .eq('auth_user_id', user.id)

        if (!admins || admins.length === 0) {
            return NextResponse.json({ error: 'No admin access' }, { status: 403 })
        }

        const isSuperAdmin = admins.some((a: any) => a.scope === 'global' || a.role === 'super_admin')
        let companyId: string | null = null
        if (isSuperAdmin) {
            const { cookies } = await import('next/headers')
            const cookieStore = await cookies()
            companyId = cookieStore.get('corporate_company_id')?.value || null
        }
        if (!companyId) {
            const instanceAdmin = admins.find((a: any) => a.company_id)
            companyId = instanceAdmin?.company_id || null
        }
        if (!companyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        // Check permission (must be admin or super_admin)
        const match = admins.find((a: any) => a.company_id === companyId)
        const role = isSuperAdmin ? 'super_admin' : match?.role
        if (!['admin', 'super_admin'].includes(role || '')) {
            return NextResponse.json({ error: 'Insufficient permissions — admin required' }, { status: 403 })
        }

        const body = await request.json()
        const { contactId } = body

        if (!contactId) {
            return NextResponse.json({ error: 'contactId required' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Verify the contact belongs to this company
        const { data: contact } = await serviceClient
            .from('contacts')
            .select('id, phone')
            .eq('id', contactId)
            .eq('client_company_id', companyId)
            .single()

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found in this company' }, { status: 404 })
        }

        // Delete from all related tables (order matters for FK constraints)
        const deletions = [
            serviceClient.from('ai_enabled').delete().eq('contact_id', contactId).eq('company_id', companyId),
            serviceClient.from('ai_chat_memory').delete().eq('contact_id', contactId).eq('instance_company_id', companyId),
            serviceClient.from('ai_chat_slices').delete().eq('contact_id', contactId).eq('instance_company_id', companyId),
            serviceClient.from('user_context').delete().eq('contact_id', contactId).eq('company_id', companyId),
            serviceClient.from('user_memory_snapshot').delete().eq('contact_id', contactId).eq('company_id', companyId),
            serviceClient.from('financial_transactions').delete().eq('contact_id', contactId).eq('context_company_id', companyId),
            serviceClient.from('goals').delete().eq('contact_id', contactId).eq('context_company_id', companyId),
            serviceClient.from('tasks').delete().eq('contact_id', contactId).eq('context_company_id', companyId),
            serviceClient.schema('wa').from('memberships').delete().eq('contact_id', contactId).eq('client_company_id', companyId),
        ]

        const results = await Promise.allSettled(deletions)
        const errors = results.filter(r => r.status === 'rejected')
        if (errors.length > 0) {
            console.warn('Some deletions failed (non-blocking):', errors)
        }

        // Finally delete the contact itself
        const { error: deleteContactError } = await serviceClient
            .schema('wa')
            .from('contacts')
            .delete()
            .eq('id', contactId)
            .eq('client_company_id', companyId)

        if (deleteContactError) {
            console.error('Error deleting contact:', deleteContactError)
            return NextResponse.json({ error: deleteContactError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error in DELETE /api/corporate/delete-user:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
