import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Public (no auth) API to fetch company branding by custom domain.
 * Used by the corporate login page to show the company's logo and colors.
 * 
 * GET /api/corporate/branding?domain=app.miempresa.com
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const domain = searchParams.get('domain')

        if (!domain) {
            return NextResponse.json({ error: 'domain parameter is required' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: company, error } = await supabase
            .from('client_companies')
            .select('name, logo_url, logo_dark_url, logo_icon_url, primary_color, secondary_color, accent_color, cover_image_url, tagline, frontend_config')
            .eq('custom_domain', domain)
            .eq('is_active', true)
            .single()

        if (error || !company) {
            // Return empty branding — no company found for this domain
            return NextResponse.json({ found: false })
        }

        const frontendConfig = (company.frontend_config || {}) as Record<string, any>

        return NextResponse.json({
            found: true,
            name: company.name,
            logo_url: company.logo_url,
            logo_dark_url: company.logo_dark_url,
            logo_icon_url: company.logo_icon_url,
            primary_color: company.primary_color,
            secondary_color: company.secondary_color,
            accent_color: company.accent_color,
            cover_image_url: company.cover_image_url,
            tagline: company.tagline,
            login_background_url: frontendConfig.portal?.login_background_url || null,
            login_welcome_text: frontendConfig.portal?.login_welcome_text || null,
        })
    } catch (error: any) {
        console.error('Error in GET /api/corporate/branding:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
