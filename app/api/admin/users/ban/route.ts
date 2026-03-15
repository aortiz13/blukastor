import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List all banned users
export async function GET() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('banned_users')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
}

// POST: Ban a user
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const body = await request.json()

    const { phone, client_company_id, reason, banned_by } = body

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

    const { data, error } = await supabase
        .from('banned_users')
        .insert({
            phone,
            client_company_id,
            reason: reason || null,
            banned_by: banned_by || null,
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
