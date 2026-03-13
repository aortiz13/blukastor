import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCompanyByDomain } from '@/lib/data/companies'
import { GeneralSettings } from './_components/GeneralSettings'

export default async function SettingsPage({ params }: { params: Promise<{ domain: string }> }) {
    const supabase = await createClient()
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(`/${domain}/settings`)}`)
    }

    const company = await getCompanyByDomain(supabase, domain)
    if (!company) return <div>Empresa no encontrada</div>

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configuración</h1>
                <p className="text-muted-foreground mt-2">
                    Administrar configuración de {company.name}
                </p>
            </div>

            <GeneralSettings company={company} />
        </div>
    )
}
