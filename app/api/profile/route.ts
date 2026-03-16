import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

/**
 * GET /api/profile?contact_id=xxx
 * Fetch profile data from user_context for the given contact.
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const url = new URL(request.url)
        const contactId = url.searchParams.get('contact_id')
        if (!contactId) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

        const serviceClient = createServiceClient()

        // Verify user owns this contact via public view
        const { data: contact } = await serviceClient
            .from('wa_contacts_view')
            .select('id, user_id, push_name, real_name, nickname, phone')
            .eq('id', contactId)
            .single()

        if (!contact || contact.user_id !== user.id) {
            // Also allow if user is admin of the company
            return NextResponse.json({ error: 'No access' }, { status: 403 })
        }

        // Fetch user_context profile
        const { data: ctx } = await serviceClient
            .from('user_context')
            .select('profile, preferred_name, profile_completion_percent')
            .eq('contact_id', contactId)
            .single()

        // Fetch membership status
        const { data: membership } = await serviceClient
            .from('membership_status_v2')
            .select('plan, status, started_at, expires_at, company_name')
            .eq('contact_id', contactId)
            .maybeSingle()

        return NextResponse.json({
            contact: {
                push_name: contact.push_name,
                real_name: contact.real_name,
                nickname: contact.nickname,
                phone: contact.phone,
            },
            profile: ctx?.profile || {},
            preferred_name: ctx?.preferred_name || null,
            completion: ctx?.profile_completion_percent || 0,
            membership: membership || null,
        })
    } catch (error: any) {
        console.error('Error GET /api/profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * PATCH /api/profile
 * Update profile data in user_context for the given contact.
 */
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { contact_id, profile } = body
        if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

        const serviceClient = createServiceClient()

        // Verify user owns this contact via public view
        const { data: contact } = await serviceClient
            .from('wa_contacts_view')
            .select('id, user_id')
            .eq('id', contact_id)
            .single()

        if (!contact || contact.user_id !== user.id) {
            return NextResponse.json({ error: 'No access' }, { status: 403 })
        }

        // Calculate completion percentage
        const profileFields = ['real_name', 'nickname', 'email', 'country', 'city', 'job_title', 'industry', 'bio']
        const filledCount = profileFields.filter(f => profile[f] && String(profile[f]).trim().length > 0).length
        const completionPercent = Math.round((filledCount / profileFields.length) * 100)

        // Upsert user_context with profile data
        const { data: existing } = await serviceClient
            .from('user_context')
            .select('id')
            .eq('contact_id', contact_id)
            .single()

        if (existing) {
            const { error } = await serviceClient
                .from('user_context')
                .update({
                    profile,
                    preferred_name: profile.nickname || profile.real_name || null,
                    profile_completion_percent: completionPercent,
                    last_updated: new Date().toISOString(),
                })
                .eq('contact_id', contact_id)

            if (error) {
                console.error('Error updating profile:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
        } else {
            // Create new user_context record
            const { error } = await serviceClient
                .from('user_context')
                .insert({
                    id: crypto.randomUUID(),
                    contact_id: contact_id,
                    context_type: 'portal',
                    context_data: {},
                    profile,
                    preferred_name: profile.nickname || profile.real_name || null,
                    profile_completion_percent: completionPercent,
                    last_updated: new Date().toISOString(),
                })

            if (error) {
                console.error('Error creating profile:', error)
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
        }

        // Also update wa.contacts real_name and nickname
        const contactUpdate: any = {}
        if (profile.real_name) contactUpdate.real_name = profile.real_name
        if (profile.nickname) contactUpdate.nickname = profile.nickname

        if (Object.keys(contactUpdate).length > 0) {
            // Use direct SQL to update wa.contacts since view is read-only
            const setClauses = Object.entries(contactUpdate)
                .map(([k, v]) => `${k} = '${String(v).replace(/'/g, "''")}'`)
                .join(', ')
            await serviceClient.rpc('exec_sql_void', {
                sql_query: `UPDATE wa.contacts SET ${setClauses} WHERE id = '${contact_id}'`
            }).maybeSingle()
        }

        return NextResponse.json({
            success: true,
            completion: completionPercent,
        })
    } catch (error: any) {
        console.error('Error PATCH /api/profile:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
