import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanyByDomain } from '@/lib/data/companies'
import { Palette } from 'lucide-react'
import { CorporateBrandingForm } from '@/app/corporate/branding/corporate-branding-form'

export const dynamic = 'force-dynamic'

export default async function PortalBrandingPage({
    params,
}: {
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect(`/login?next=${encodeURIComponent('/branding')}`)
    }

    // Fetch company (needed for companyId context)
    const company = await getCompanyByDomain(supabase, domain)
    if (!company) {
        return <div className="p-8 text-red-500">Error: No se encontró la empresa.</div>
    }

    // Fetch user's personal branding (starts empty if none exists)
    const { data: userBranding } = await supabase
        .from('user_branding')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', company.id)
        .maybeSingle()

    // Pass empty object if no personal branding yet — user starts fresh
    const initialData = userBranding || { id: company.id }

    return (
        <div className="space-y-4 pt-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-pink-100 rounded-2xl">
                        <Palette className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Mi Marca Personal
                        </h1>
                        <p className="text-gray-500 mt-0.5">
                            Configura tu identidad de marca personal
                        </p>
                    </div>
                </div>
            </div>

            <CorporateBrandingForm
                initialData={initialData}
                canEdit={true}
                saveEndpoint="/api/portal/branding"
                companyIdOverride={company.id}
                mode="portal"
            />
        </div>
    )
}
