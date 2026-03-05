import { getCompanyByDomain } from '@/lib/data/companies'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
// Sidebar removed - moved to (dashboard)/layout.tsx

export async function generateMetadata({
    params,
}: {
    params: Promise<{ domain: string }>
}): Promise<Metadata> {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()
    const company = await getCompanyByDomain(supabase, domain)

    if (!company) {
        return { title: 'Portal' }
    }

    const branding = company?.frontend_config as any || {}
    const faviconUrl = company?.favicon_url || branding.favicon_url || ''
    const logoIconUrl = company?.logo_icon_url || branding.logo_icon_url || ''
    const iconUrl = faviconUrl || logoIconUrl

    return {
        title: {
            default: company.name,
            template: `%s | ${company.name}`,
        },
        ...(iconUrl ? {
            icons: {
                icon: iconUrl,
                shortcut: iconUrl,
                apple: iconUrl,
            },
        } : {}),
    }
}

export default async function PortalLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()
    const company = await getCompanyByDomain(supabase, domain)

    // If no company found for this domain, show a "Not Found" / "Setup" screen
    // This handles Vercel Preview URLs that are not in the database
    if (!company) {
        return (
            <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-gray-50 text-gray-900">
                <h1 className="text-4xl font-bold">Domain Not Configured</h1>
                <p className="max-w-md text-center text-gray-600">
                    The domain <code className="bg-gray-200 px-1 py-0.5 rounded text-sm">{domain}</code> is not mapped to any company in Blukastor.
                </p>
                <div className="text-sm text-gray-500">
                    <p>If you are the admin, please add this domain to the `companies` table.</p>
                </div>
            </div>
        )
    }

    const branding = company?.frontend_config as any || {}
    const primaryColor = company?.primary_color || branding.primary_color || '#000000'
    const fontHeading = company?.font_heading || 'Inter'
    const fontBody = company?.font_body || 'Inter'

    // Build Google Fonts URL for the company's selected fonts
    const fontsToLoad = [...new Set([fontHeading, fontBody])]
    const googleFontsUrl = `https://fonts.googleapis.com/css2?${fontsToLoad.map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`).join('&')}&display=swap`

    return (
        <>
            <link rel="stylesheet" href={googleFontsUrl} />
            <div
                className="min-h-screen bg-gray-50/30"
                style={{
                    ['--primary' as any]: primaryColor,
                    ['--font-heading' as any]: `'${fontHeading}', sans-serif`,
                    ['--font-body' as any]: `'${fontBody}', sans-serif`,
                    fontFamily: `'${fontBody}', sans-serif`,
                } as any}
            >
                {children}
            </div>
        </>
    )
}
