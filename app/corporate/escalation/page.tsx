import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { ShieldAlert, MessageSquare, Clock, CheckCircle, AlertTriangle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function CorporateEscalationPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Fetch escalated conversations - messages where AI flagged for manual review
    // Look for manual_ai_intent or specific statuses that indicate escalation
    const { data: escalatedMessages } = await supabase
        .from('wa_incoming')
        .select('message_id, phone, push_name, content, manual_ai_intent, manual_notes, ai_intent, response_status, created_at, contact_id')
        .eq('client_company_id', activeCompany.companyId)
        .or('manual_ai_intent.neq.null,response_status.eq.escalated')
        .order('created_at', { ascending: false })
        .limit(50)

    // Also check system_error_logs for critical issues
    const { data: errorLogs } = await supabase
        .from('system_error_logs')
        .select('id, severity, origin, error_type, error_message, resolved, created_at, contact_id')
        .eq('client_company_id', activeCompany.companyId)
        .order('created_at', { ascending: false })
        .limit(20)

    const messages = escalatedMessages || []
    const errors = errorLogs || []
    const unresolvedErrors = errors.filter(e => !e.resolved)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Escalamiento Manual</h1>
                <p className="text-gray-500 mt-1">
                    Solicitudes de ayuda y escalaciones de <span className="font-semibold text-gray-700">{activeCompany.companyName}</span>
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                        <ShieldAlert size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Escalaciones</p>
                        <p className="text-2xl font-black text-gray-900">{messages.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Errores Sin Resolver</p>
                        <p className="text-2xl font-black text-gray-900">{unresolvedErrors.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CheckCircle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resueltos</p>
                        <p className="text-2xl font-black text-gray-900">{errors.filter(e => e.resolved).length}</p>
                    </div>
                </div>
            </div>

            {/* Escalated Messages */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare size={18} className="text-gray-400" />
                        Conversaciones Escaladas
                    </h2>
                </div>

                {messages.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {messages.map((msg: any) => (
                            <div key={msg.message_id} className="p-6 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1">
                                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                            <User size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-gray-900 text-sm">{msg.push_name || 'Sin nombre'}</p>
                                                <span className="font-mono text-xs text-gray-400">{msg.phone}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{msg.content || 'Sin contenido'}</p>
                                            {msg.manual_ai_intent && (
                                                <div className="mt-2 px-3 py-1.5 bg-orange-50 rounded-lg text-xs text-orange-700 font-medium">
                                                    <span className="font-bold">Intent Manual:</span> {msg.manual_ai_intent}
                                                </div>
                                            )}
                                            {msg.manual_notes && (
                                                <div className="mt-1 px-3 py-1.5 bg-blue-50 rounded-lg text-xs text-blue-700 font-medium">
                                                    <span className="font-bold">Notas:</span> {msg.manual_notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            msg.response_status === 'escalated' ? "bg-orange-100 text-orange-700" :
                                                msg.response_status === 'resolved' ? "bg-green-100 text-green-700" :
                                                    "bg-gray-100 text-gray-500"
                                        )}>
                                            {msg.response_status || 'pending'}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {new Date(msg.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">No hay escalaciones pendientes</p>
                        <p className="text-gray-400 text-sm">Las solicitudes de ayuda manual aparecerán aquí</p>
                    </div>
                )}
            </div>

            {/* System Errors */}
            {errors.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h2 className="font-bold text-gray-900 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-gray-400" />
                            Errores del Sistema
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {errors.map((err) => (
                            <div key={err.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full",
                                            err.severity === 'critical' ? "bg-red-500" :
                                                err.severity === 'warning' ? "bg-yellow-500" : "bg-blue-500"
                                        )} />
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{err.error_type}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{err.error_message}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            err.resolved ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {err.resolved ? 'Resuelto' : 'Pendiente'}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(err.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
