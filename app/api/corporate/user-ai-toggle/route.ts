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

        const body = await request.json()
        const { contactId, enabled, companyId: bodyCompanyId } = body

        if (!contactId || typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'contactId and enabled (boolean) required' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Try to find the contact — could be wa.contacts.id or auth.users.id (user_id)
        let contact: any = null
        let resolvedCompanyId: string | null = bodyCompanyId || null

        // 1. Try direct lookup by contact id
        const { data: directContact } = await serviceClient
            .schema('wa')
            .from('contacts')
            .select('id, phone, client_company_id')
            .eq('id', contactId)
            .maybeSingle()

        if (directContact) {
            contact = directContact
            resolvedCompanyId = resolvedCompanyId || directContact.client_company_id
        } else {
            // 2. Try lookup by auth user_id (the userId is an auth.users.id)
            const { data: userContact } = await serviceClient
                .schema('wa')
                .from('contacts')
                .select('id, phone, client_company_id')
                .eq('user_id', contactId)
                .limit(1)
                .maybeSingle()

            if (userContact) {
                contact = userContact
                resolvedCompanyId = resolvedCompanyId || userContact.client_company_id
            }
        }

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
        }

        if (!resolvedCompanyId) {
            // Fallback: resolve from admin profile
            if (isSuperAdmin) {
                const { cookies } = await import('next/headers')
                const cookieStore = await cookies()
                resolvedCompanyId = cookieStore.get('corporate_company_id')?.value || null
            }
            if (!resolvedCompanyId) {
                const instanceAdmin = admins.find((a: any) => a.company_id)
                resolvedCompanyId = instanceAdmin?.company_id || null
            }
        }

        if (!resolvedCompanyId) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        // Upsert ai_enabled row
        const { error: upsertError } = await serviceClient
            .from('ai_enabled')
            .upsert({
                contact_id: contact.id,
                company_id: resolvedCompanyId,
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
