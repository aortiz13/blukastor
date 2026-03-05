import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { FileCheck, CheckCircle, XCircle, Clock, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function CorporateCompliancePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Fetch compliance records with contact info
    const { data: complianceRecords } = await supabase
        .from('user_compliance')
        .select('*, contacts!inner(phone, push_name, real_name)')
        .eq('client_company_id', activeCompany.companyId)
        .order('created_at', { ascending: false })

    // Get total contacts to calculate missing compliance
    const { count: totalContacts } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('client_company_id', activeCompany.companyId)

    const records = complianceRecords || []
    const accepted = records.filter(r => r.terms_accepted)
    const pending = records.filter(r => !r.terms_accepted)
    const totalUsers = totalContacts || 0
    const withCompliance = records.length
    const withoutCompliance = totalUsers - withCompliance

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Cumplimiento (T&C)</h1>
                <p className="text-gray-500 mt-1">
                    Estado de aceptación de Términos y Condiciones de <span className="font-semibold text-gray-700">{activeCompany.companyName}</span>
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Usuarios', value: totalUsers, icon: Shield, gradient: 'from-gray-500 to-gray-600' },
                    { label: 'Aceptados', value: accepted.length, icon: CheckCircle, gradient: 'from-green-500 to-green-600' },
                    { label: 'Pendientes', value: pending.length, icon: Clock, gradient: 'from-yellow-500 to-yellow-600' },
                    { label: 'Sin Registro', value: withoutCompliance, icon: XCircle, gradient: 'from-red-500 to-red-600' },
                ].map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={cn("p-3 rounded-2xl bg-gradient-to-br text-white", stat.gradient)}>
                            <stat.icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-gray-900">Tasa de Cumplimiento</p>
                    <p className="text-2xl font-black text-gray-900">
                        {totalUsers > 0 ? Math.round((accepted.length / totalUsers) * 100) : 0}%
                    </p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalUsers > 0 ? (accepted.length / totalUsers) * 100 : 0}%` }}
                    />
                </div>
                <div className="flex items-center gap-6 mt-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Aceptados</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Pendientes</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-300" /> Sin registro</span>
                </div>
            </div>

            {/* Compliance Records Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileCheck size={18} className="text-gray-400" />
                        Registros de Cumplimiento
                    </h2>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Usuario</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teléfono</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha Aceptación</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {records.map((record: any) => (
                            <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{record.contacts?.push_name || 'Sin nombre'}</p>
                                        {record.contacts?.real_name && (
                                            <p className="text-xs text-gray-400">{record.contacts.real_name}</p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm text-gray-600">{record.contacts?.phone}</td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1",
                                        record.terms_accepted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                    )}>
                                        {record.terms_accepted ? <><CheckCircle size={12} /> Aceptado</> : <><Clock size={12} /> Pendiente</>}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {record.accepted_at ? new Date(record.accepted_at).toLocaleString() : '—'}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-400">
                                    {record.ip_address || '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {records.length === 0 && (
                    <div className="text-center py-12">
                        <FileCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No hay registros de cumplimiento</p>
                        <p className="text-gray-400 text-sm">Los registros aparecerán aquí cuando los usuarios acepten los T&C</p>
                    </div>
                )}
            </div>
        </div>
    )
}
