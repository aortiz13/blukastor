import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanyByDomain } from '@/lib/data/companies'
import { GeneralSettings } from './_components/GeneralSettings'
import { SettingsPageClient } from './_components/SettingsPageClient'

export default async function SettingsPage({ params }: { params: Promise<{ domain: string }> }) {
    const supabase = await createClient()
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?next=${encodeURIComponent('/settings')}`)
    }

    const company = await getCompanyByDomain(supabase, domain)
    if (!company) return <div>Company not found</div>

    return (
        <SettingsPageClient companyName={company.name}>
            <GeneralSettings company={company} />
        </SettingsPageClient>
    )
}

