import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

        const body = await request.json()
        const { contactId, enabled } = body

        if (!contactId || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'contactId and enabled (boolean) required' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Get phone from contact
        const { data: contact } = await serviceClient
            .from('contacts')
            .select('phone')
            .eq('id', contactId)
            .eq('client_company_id', companyId)
            .single()

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
        }

        // Upsert ai_enabled row
        const { error: upsertError } = await serviceClient
            .from('ai_enabled')
            .upsert({
                contact_id: contactId,
                company_id: companyId,
                ai_enabled: enabled,
                phone: contact.phone,
                updated_by: 'corporate_admin',
                last_updated: new Date().toISOString(),
            }, {
                onConflict: 'contact_id,company_id',
            })

        if (upsertError) {
            console.error('Error upserting ai_enabled:', upsertError)
            return NextResponse.json({ error: upsertError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, ai_enabled: enabled })
    } catch (error: any) {
        console.error('Error in POST /api/corporate/user-ai-toggle:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
