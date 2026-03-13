import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { Bot } from 'lucide-react'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { AgentConfigForm } from './agent-config-form'

export default async function CorporateAgentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/corporate/login')

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Use service client to bypass RLS for corporate portal
    const serviceClient = createServiceClient()

    // Fetch agents for this company
    const { data: agents } = await serviceClient
        .from('company_prompts')
        .select('id, agent_type, agent_name, personality_traits, target_audience')
        .eq('company_id', activeCompany.companyId)
        .eq('active', true)
        .order('agent_type')

    // Check if current user has edit permissions
    const adminProfile = admins.find(a => a.company_id === activeCompany.companyId) || admins[0]
    const canEdit = adminProfile?.role !== 'viewer'

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-violet-100 rounded-2xl">
                        <Bot className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                            Configuración de Agentes
                        </h1>
                        <p className="text-gray-500 mt-0.5">
                            Personaliza el nombre, personalidad y audiencia de tus agentes virtuales
                        </p>
                    </div>
                </div>
            </div>

            {!canEdit && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                    <strong>Solo lectura:</strong> Tu rol de Viewer no permite editar la configuración de agentes. Contacta al administrador de tu empresa.
                </div>
            )}

            <AgentConfigForm
                agents={agents || []}
                canEdit={canEdit}
                companyId={activeCompany.companyId}
            />
        </div>
    )
}
