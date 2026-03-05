import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// All branding fields that can be updated
const ALLOWED_FIELDS = [
    // Logos
    'logo_url', 'logo_dark_url', 'logo_icon_url', 'favicon_url', 'cover_image_url', 'cover_image_mobile_url',
    // Colors
    'primary_color', 'secondary_color', 'accent_color',
    // Typography
    'font_heading', 'font_body',
    // Identity
    'tagline', 'description', 'mission', 'vision', 'values_text',
    // Web & Social
    'website_url', 'custom_domain',
    'social_instagram', 'social_facebook', 'social_linkedin',
    'social_twitter', 'social_youtube', 'social_tiktok', 'social_whatsapp',
    // Corporate data
    'country', 'address', 'tax_id', 'timezone', 'locale',
    // JSONB config
    'frontend_config',
]

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

        // Check if user is super admin
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminChecks } = await supabase
            .from('admin_profiles')
            .select('role, scope')
            .eq('auth_user_id', user.id)

        const adminCheck = adminChecks?.find((a: any) => a.scope === 'global' || a.role === 'super_admin') || adminChecks?.[0]

        if (!adminCheck || (adminCheck.scope !== 'global' && adminCheck.role !== 'super_admin')) {
            return NextResponse.json({ error: 'Forbidden: Super admin privileges required' }, { status: 403 })
        }

        // Parse request body
        const body = await request.json()

        // Build updates only from allowed fields
        const updates: Record<string, any> = {}
        for (const field of ALLOWED_FIELDS) {
            if (body[field] !== undefined) {
                updates[field] = body[field]
            }
        }

        // Use service client to bypass RLS for DB operations
        const serviceClient = createServiceClient()

        // Handle frontend_config merge (deep merge with existing)
        if (body.frontend_config && typeof body.frontend_config === 'object') {
            // Fetch existing config first
            const { data: existing } = await serviceClient
                .from('client_companies')
                .select('frontend_config')
                .eq('id', id)
                .single()

            const existingConfig = (existing?.frontend_config as Record<string, any>) || {}
            updates.frontend_config = {
                ...existingConfig,
                ...body.frontend_config,
                // Deep merge nested objects
                portal: { ...(existingConfig.portal || {}), ...(body.frontend_config.portal || {}) },
                legal: { ...(existingConfig.legal || {}), ...(body.frontend_config.legal || {}) },
                communications: { ...(existingConfig.communications || {}), ...(body.frontend_config.communications || {}) },
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No branding fields to update' }, { status: 400 })
        }

        // Update company branding
        const { data: company, error } = await serviceClient
            .from('client_companies')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating branding:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            company,
            message: 'Branding updated successfully'
        })
    } catch (error: any) {
        console.error('Error in POST /api/admin/companies/[id]/branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
