import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// All branding fields that portal users can update on client_companies
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
    'website_url',
    'social_instagram', 'social_facebook', 'social_linkedin',
    'social_twitter', 'social_youtube', 'social_tiktok', 'social_whatsapp',
    // Corporate data
    'country', 'address', 'tax_id', 'timezone', 'locale',
    // JSONB config
    'frontend_config',
]

/**
 * API for portal end-users to save branding for their client_company.
 * POST /api/portal/branding
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

        if (!companyId) {
            return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
        }

        const serviceClient = createServiceClient()

        // Verify the company exists
        const { data: company, error: companyError } = await serviceClient
            .from('client_companies')
            .select('id')
            .eq('id', companyId)
            .single()

        if (companyError || !company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        // Build updates only from allowed fields
        const updates: Record<string, any> = {}
        for (const field of ALLOWED_FIELDS) {
            if (body[field] !== undefined) {
                updates[field] = body[field]
            }
        }

        // Handle frontend_config merge
        if (body.frontend_config && typeof body.frontend_config === 'object') {
            const { data: existing } = await serviceClient
                .from('client_companies')
                .select('frontend_config')
                .eq('id', companyId)
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

        // Portal users cannot change custom_domain
        delete updates.custom_domain

        // Portal users cannot change powered_by_visible (super_admin only)
        if (updates.frontend_config?.portal) {
            delete updates.frontend_config.portal.powered_by_visible
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No branding fields to update' }, { status: 400 })
        }

        const { data: updatedCompany, error } = await serviceClient
            .from('client_companies')
            .update(updates)
            .eq('id', companyId)
            .select()
            .single()

        if (error) {
            console.error('Error updating portal branding:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            company: updatedCompany,
            message: 'Branding actualizado exitosamente'
        })
    } catch (error: any) {
        console.error('Error in POST /api/portal/branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
