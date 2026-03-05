import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { CorporateSidebar } from '@/components/layout/corporate-sidebar'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'

export default async function CorporateLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Allow the corporate login page to render without auth
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || ''

    if (pathname === '/corporate/login') {
        return <>{children}</>
    }

    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/corporate/login')
    }

    // Check for corporate admin access via admin_profiles
    const { admins, error } = await getCorporateAdminProfile(supabase, user.id)

    if (error || admins.length === 0) {
        console.error('Non-corporate-admin user tried to access corporate portal:', user.email)
        return (
            <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-gray-50 text-gray-900 font-sans">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h1 className="text-2xl font-bold">Acceso Denegado</h1>
                <p className="max-w-md text-center text-gray-600">
                    Tu usuario <code className="bg-gray-200 px-1 py-0.5 rounded text-sm">{user.email}</code> no tiene permisos de Portal Corporativo.
                </p>
                <p className="text-sm text-gray-400">Contacta al equipo de Blukastor para solicitar acceso.</p>
                <a href="/" className="text-sm font-bold text-black underline underline-offset-4">
                    Volver al Inicio
                </a>
            </div>
        )
    }

    // Resolve which company to show
    // Super admins can switch companies via URL param
    // (we read searchParams from cookies/headers in a layout-compatible way)
    const isSuperAdmin = admins.some(a => a.scope === 'global' || a.role === 'super_admin')

    // For super admins, we need a way to pass the selected company.
    // We use a cookie since layouts can't access searchParams directly.
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null

    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)

    if (!activeCompany) {
        return <div className="p-8 text-red-500">Error: No se pudo resolver la empresa activa.</div>
    }

    // Fetch company branding
    const { data: companyBranding } = await supabase
        .from('client_companies')
        .select('logo_url, primary_color, secondary_color, frontend_config')
        .eq('id', activeCompany.companyId)
        .single()

    // For super admins, fetch all companies for the picker
    let availableCompanies: { id: string; name: string }[] = []
    if (isSuperAdmin) {
        const { data: allCompanies } = await supabase
            .from('client_companies')
            .select('id, name')
            .eq('is_active', true)
            .order('name')
        availableCompanies = allCompanies || []
    } else {
        availableCompanies = admins.map(a => ({ id: a.company_id, name: a.company_name }))
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <CorporateSidebar
                companyName={activeCompany.companyName}
                companyId={activeCompany.companyId}
                logoUrl={companyBranding?.logo_url}
                primaryColor={companyBranding?.primary_color || '#6366f1'}
                isSuperAdmin={isSuperAdmin}
                availableCompanies={availableCompanies}
            />
            <main className="flex-1 overflow-y-auto relative focus:outline-none">
                <div className="py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    )
}
