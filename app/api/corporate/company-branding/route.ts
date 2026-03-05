import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// All branding fields that corporate admins can update
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

export async function GET(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resolved = await resolveCompanyAndRole(supabase, user.id)
        if (!resolved) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        const serviceClient = createServiceClient()
        const { data: company, error } = await serviceClient
            .from('client_companies')
            .select('*')
            .eq('id', resolved.companyId)
            .single()

        if (error || !company) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 })
        }

        return NextResponse.json({ company })
    } catch (error: any) {
        console.error('Error in GET /api/corporate/company-branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const resolved = await resolveCompanyAndRole(supabase, user.id)
        if (!resolved) {
            return NextResponse.json({ error: 'No company found' }, { status: 403 })
        }

        // Check permissions — viewers cannot edit
        if (resolved.role === 'viewer') {
            return NextResponse.json({ error: 'Insufficient permissions. Owner or Admin role required.' }, { status: 403 })
        }

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

        // Handle frontend_config merge
        if (body.frontend_config && typeof body.frontend_config === 'object') {
            const { data: existing } = await serviceClient
                .from('client_companies')
                .select('frontend_config')
                .eq('id', resolved.companyId)
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

        // Corporate admins cannot change custom_domain
        delete updates.custom_domain

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No branding fields to update' }, { status: 400 })
        }

        const { data: company, error } = await serviceClient
            .from('client_companies')
            .update(updates)
            .eq('id', resolved.companyId)
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
        console.error('Error in POST /api/corporate/company-branding:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}

/**
 * Resolve the company ID and effective role for the current user.
 * Super admins get 'super_admin' role for any company they switch to.
 * Instance admins get their assigned role.
 */
async function resolveCompanyAndRole(
    supabase: any,
    userId: string
): Promise<{ companyId: string; role: string } | null> {
    const { data: admins } = await supabase
        .from('admin_profiles')
        .select('company_id, role, scope')
        .eq('auth_user_id', userId)

    if (!admins || admins.length === 0) return null

    const isSuperAdmin = admins.some((a: any) => a.scope === 'global' || a.role === 'super_admin')

    // Resolve which company to use
    let companyId: string | null = null

    if (isSuperAdmin) {
        // Check cookie for selected company
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        const selectedCompanyId = cookieStore.get('corporate_company_id')?.value
        if (selectedCompanyId) companyId = selectedCompanyId
    }

    if (!companyId) {
        // Fall back to first company with a company_id
        const instanceAdmin = admins.find((a: any) => a.company_id)
        companyId = instanceAdmin?.company_id || null
    }

    if (!companyId) return null

    // Resolve the effective role
    if (isSuperAdmin) {
        return { companyId, role: 'super_admin' }
    }

    // Find the role for this specific company
    const match = admins.find((a: any) => a.company_id === companyId)
    return { companyId, role: match?.role || 'viewer' }
}
