import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanyByDomain } from '@/lib/data/companies'
import { CorporateBrandingForm } from '@/app/corporate/branding/corporate-branding-form'
import { BrandingHeader } from './_components/BrandingHeader'

export const dynamic = 'force-dynamic'

export default async function PortalBrandingPage({
    params,
}: {
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect(`/login?next=${encodeURIComponent('/branding')}`)
    }

    const company = await getCompanyByDomain(supabase, domain)
    if (!company) {
        return <div className="p-8 text-red-500">Error: Company not found.</div>
    }

    const { data: userBranding } = await supabase
        .from('user_branding')
        .select('*')
        .eq('user_id', user.id)
        .eq('company_id', company.id)
        .maybeSingle()

    const initialData = userBranding || { id: company.id }

    return (
        <div className="space-y-4 pt-6">
            <BrandingHeader />
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
