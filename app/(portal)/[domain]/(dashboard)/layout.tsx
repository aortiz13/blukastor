import { getCompanyByDomain } from '@/lib/data/companies'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation' // Change notFound to redirect
import { Sidebar } from '@/components/layout/sidebar'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    // 1. Check Authentication FIRST
    const { data: { user } } = await supabase.auth.getUser()

    // Redirect user to login with return path
    if (!user) {
        redirect(`/login?next=${encodeURIComponent('/dashboard')}`)
    }

    // Get user display name
    const userMeta = user.user_metadata || {}
    const userName = userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Usuario'

    // 2. Fetch Company Data for Sidebar
    const company = await getCompanyByDomain(supabase, domain)
    if (!company) {
        return null
    }

    const branding = company?.frontend_config as any || {}
    const primaryColor = company?.primary_color || branding.primary_color || '#000000'
    const fontHeading = company?.font_heading || 'Inter'
    const companyLocale = company?.locale || 'es'

    return (
        <DashboardLayoutClient initialLocale={companyLocale}>
            <div className="flex h-screen overflow-hidden">
                <Sidebar
                    domain={domain}
                    companyName={company.name}
                    logoUrl={company?.logo_url || branding.logo_url}
                    primaryColor={primaryColor}
                    userName={userName}
                />

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Mobile Header (Hidden on Desktop) */}
                    <header className="md:hidden border-b p-4 bg-white flex justify-between items-center">
                        <span className="font-bold text-lg" style={{ fontFamily: `'${fontHeading}', sans-serif` }}>{company.name}</span>
                        <button className="p-2 bg-gray-50 rounded-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                        </button>
                    </header>

                    <main className="flex-1 overflow-y-auto relative">
                        {children}
                    </main>
                </div>
            </div>
        </DashboardLayoutClient>
    )
}

