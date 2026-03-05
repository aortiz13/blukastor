import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Palette } from 'lucide-react'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { CorporateBrandingForm } from './corporate-branding-form'

export default async function CorporateBrandingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/corporate/login')

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Fetch full company data
    const { data: company } = await supabase
        .from('client_companies')
        .select('*')
        .eq('id', activeCompany.companyId)
        .single()

    if (!company) return <div className="p-8 text-red-500">Error: No se encontró la empresa.</div>

    // Check if current user has edit permissions (owner/admin, not viewer)
    const adminProfile = admins.find(a => a.company_id === activeCompany.companyId) || admins[0]
    const canEdit = adminProfile?.role !== 'viewer'

    return (
        <div className="space-y-6">
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
                            Personaliza la apariencia de tu portal y la identidad de tu empresa
                        </p>
                    </div>
                </div>
            </div>

            {!canEdit && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                    <strong>Solo lectura:</strong> Tu rol de Viewer no permite editar la configuración de branding. Contacta al administrador de tu empresa.
                </div>
            )}

            <CorporateBrandingForm initialData={company} canEdit={canEdit} />
        </div>
    )
}
