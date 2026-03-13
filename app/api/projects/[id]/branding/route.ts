import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// All branding fields that can be updated on a project (companies table)
const ALLOWED_FIELDS = [
    // Logos
    'logo_url', 'logo_dark_url', 'logo_icon_url', 'favicon_url', 'cover_image_url', 'cover_image_mobile_url', 'login_bg_color',
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

        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user is a member of this project
        const serviceClient = createServiceClient()
        const { data: membership } = await serviceClient
            .from('project_members')
            .select('role')
            .eq('project_id', id)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return NextResponse.json({ error: 'Forbidden: You are not a member of this project' }, { status: 403 })
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

        // Handle frontend_config merge (deep merge with existing)
        if (body.frontend_config && typeof body.frontend_config === 'object') {
            const { data: existing } = await serviceClient
                .from('companies')
                .select('frontend_config')
                .eq('id', id)
                .single()

            const existingConfig = (existing?.frontend_config as Record<string, any>) || {}
            updates.frontend_config = {
                ...existingConfig,
                ...body.frontend_config,
                portal: { ...(existingConfig.portal || {}), ...(body.frontend_config.portal || {}) },
                legal: { ...(existingConfig.legal || {}), ...(body.frontend_config.legal || {}) },
                communications: { ...(existingConfig.communications || {}), ...(body.frontend_config.communications || {}) },
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No branding fields to update' }, { status: 400 })
        }

        // Update project branding in companies table
        const { data: company, error } = await serviceClient
            .from('companies')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating project branding:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            company,
            message: 'Branding del proyecto actualizado exitosamente'
        })
    } catch (error: any) {
        console.error('Error in POST /api/projects/[id]/branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
