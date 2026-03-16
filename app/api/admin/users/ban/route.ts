import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List all banned users with admin email and contact info
export async function GET() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('banned_users')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with admin email for banned_by_user_id
    if (data && data.length > 0) {
        const adminIds = [...new Set(data.map(d => d.banned_by_user_id).filter(Boolean))]

        let adminMap: Record<string, string> = {}
        if (adminIds.length > 0) {
            const { data: admins } = await supabase
                .from('admin_users_view')
                .select('auth_user_id, email')
                .in('auth_user_id', adminIds)

            if (admins) {
                adminMap = Object.fromEntries(
                    admins.map(a => [a.auth_user_id, a.email])
                )
            }
        }

        const enriched = data.map(ban => ({
            ...ban,
            banned_by_email: ban.banned_by_user_id ? adminMap[ban.banned_by_user_id] || null : null,
            // Fall back to legacy text if no user_id
            banned_by_display: ban.banned_by_user_id
                ? (adminMap[ban.banned_by_user_id] || 'Admin desconocido')
                : (ban.banned_by_legacy || null),
        }))

        return NextResponse.json({ data: enriched })
    }

    return NextResponse.json({ data })
}

// POST: Ban a user
export async function POST(request: NextRequest) {
    const supabase = await createClient()

    // Get the logged-in admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { phone, client_company_id, reason } = body

    if (!phone || !client_company_id) {
        return NextResponse.json(
            { error: 'phone y client_company_id son requeridos' },
            { status: 400 }
        )
    }

    // Check if already banned
    const { data: existing } = await supabase
        .from('banned_users')
        .select('id')
        .eq('phone', phone)
        .eq('client_company_id', client_company_id)
        .maybeSingle()

    if (existing) {
        return NextResponse.json(
            { error: 'Este usuario ya está banneado en esta instancia' },
            { status: 409 }
        )
    }

    // Try to resolve the wa.contacts id for this phone + company
    let waContactId: string | null = null
    const { data: contact } = await supabase
        .from('wa_contacts_view')
        .select('id')
        .eq('phone', phone)
        .eq('company_id', client_company_id)
        .maybeSingle()

    if (contact) {
        waContactId = contact.id
    }

    const { data, error } = await supabase
        .from('banned_users')
        .insert({
            phone,
            client_company_id,
            reason: reason || null,
            banned_by_user_id: user.id,
            wa_contact_id: waContactId,
        })
        .select()
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
}

// DELETE: Unban a user
export async function DELETE(request: NextRequest) {
    const supabase = await createClient()
    const body = await request.json()

    const { phone, client_company_id } = body

    if (!phone || !client_company_id) {
        return NextResponse.json(
            { error: 'phone y client_company_id son requeridos' },
            { status: 400 }
        )
    }

    const { error } = await supabase
        .from('banned_users')
        .delete()
        .eq('phone', phone)
        .eq('client_company_id', client_company_id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
