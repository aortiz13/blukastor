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
        redirect(`/login?next=${encodeURIComponent(`/${domain}/branding`)}`)
    }

    // Fetch company data
    const company = await getCompanyByDomain(supabase, domain)
    if (!company) {
        return <div className="p-8 text-red-500">Error: No se encontró la empresa.</div>
    }

    // Portal users can edit their own branding
    const canEdit = true

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-pink-100 rounded-2xl">
                        <Palette className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Branding & Personalización
                        </h1>
                        <p className="text-gray-500 mt-0.5">
                            Personaliza la apariencia de tu portal y tu identidad de marca
                        </p>
                    </div>
                </div>
            </div>

            <CorporateBrandingForm
                initialData={company}
                canEdit={canEdit}
                saveEndpoint="/api/portal/branding"
                companyIdOverride={company.id}
                mode="portal"
            />
        </div>
    )
}
