import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Fields that can be updated on user_branding
const ALLOWED_FIELDS = [
    'logo_url', 'logo_dark_url', 'logo_icon_url',
    'primary_color', 'secondary_color', 'accent_color',
    'font_heading', 'font_body',
    'tagline', 'description', 'mission', 'vision', 'values_text',
    'website_url',
    'social_instagram', 'social_facebook', 'social_linkedin',
    'social_twitter', 'social_youtube', 'social_tiktok', 'social_whatsapp',
]

/**
 * GET /api/portal/branding?companyId=xxx
 * Fetch the current user's personal branding for a specific company context.
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const companyId = searchParams.get('companyId')

        let query = supabase
            .from('user_branding')
            .select('*')
            .eq('user_id', user.id)

        if (companyId) {
            query = query.eq('company_id', companyId)
        }

        const { data, error } = await query.maybeSingle()

        if (error) {
            console.error('Error fetching user branding:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Return empty object if no branding exists yet (new user)
        return NextResponse.json({ branding: data || {} })
    } catch (error: any) {
        console.error('Error in GET /api/portal/branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/portal/branding
 * Save the current user's personal branding.
 * Body: { companyId, ...branding fields }
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { companyId } = body

        // Build updates only from allowed fields
        const updates: Record<string, any> = {}
        for (const field of ALLOWED_FIELDS) {
            if (body[field] !== undefined) {
                updates[field] = body[field]
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No branding fields to update' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Check if record already exists
        const { data: existing } = await serviceClient
            .from('user_branding')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_id', companyId || null)
            .maybeSingle()

        let result
        if (existing) {
            // Update existing
            const { data, error } = await serviceClient
                .from('user_branding')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single()
            if (error) throw error
            result = data
        } else {
            // Insert new record
            const { data, error } = await serviceClient
                .from('user_branding')
                .insert({
                    user_id: user.id,
                    company_id: companyId || null,
                    ...updates,
                })
                .select()
                .single()
            if (error) throw error
            result = data
        }

        return NextResponse.json({
            success: true,
            branding: result,
            message: 'Branding personal guardado exitosamente'
        })
    } catch (error: any) {
        console.error('Error in POST /api/portal/branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
