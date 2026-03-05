import { createClient } from '@/lib/supabase/server'
import { getCorporateAdminProfile, resolveActiveCompany } from '@/lib/actions/corporate-helpers'
import { ArrowLeft, Phone, User, Calendar, Tag, FileText, Activity, Clock, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function DataField({ label, value, icon: Icon, mono }: { label: string; value?: string | null; icon?: any; mono?: boolean }) {
    return (
        <div className="py-3.5 border-b border-gray-100 last:border-0 flex items-start gap-3">
            {Icon && (
                <div className="mt-0.5 text-gray-400">
                    <Icon size={14} />
                </div>
            )}
            <div className="flex-1">
                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</dt>
                <dd className={cn("text-sm font-semibold text-gray-900", mono && "font-mono")}>
                    {value || <span className="text-gray-300 font-normal">No disponible</span>}
                </dd>
            </div>
        </div>
    )
}

export default async function CorporateUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { admins } = await getCorporateAdminProfile(supabase, user.id)
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const selectedCompanyId = cookieStore.get('corporate_company_id')?.value || null
    const activeCompany = resolveActiveCompany(admins, selectedCompanyId)
    if (!activeCompany) return null

    // Fetch the contact
    const { data: contact, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .eq('client_company_id', activeCompany.companyId)
        .single()

    if (!contact || error) notFound()

    // Fetch membership info
    const { data: membership } = await supabase
        .from('memberships')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('client_company_id', activeCompany.companyId)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()


    // Fetch compliance
    const { data: compliance } = await supabase
        .from('user_compliance')
        .select('terms_accepted, accepted_at, ip_address')
        .eq('contact_id', contact.id)
        .eq('client_company_id', activeCompany.companyId)
        .limit(1)
        .single()

    const displayName = contact.real_name || contact.push_name || contact.nickname || contact.phone
    const lastActivity = contact.last_seen

    // Calculate trial status
    let trialStatus: string | null = null
    if (contact.trial_started_at && contact.trial_days) {
        const trialEnd = new Date(contact.trial_started_at)
        trialEnd.setDate(trialEnd.getDate() + contact.trial_days)
        const now = new Date()
        if (now < trialEnd) {
            const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            trialStatus = `Activo (${daysLeft} días restantes)`
        } else {
            trialStatus = 'Expirado'
        }
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Back button */}
            <Link
                href="/corporate/users"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Volver a Usuarios
            </Link>

            {/* Header Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-white font-bold text-2xl border border-white/20">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                            <p className="text-gray-400 font-mono text-sm mt-1">{contact.phone}</p>
                            <div className="flex items-center gap-3 mt-2">
                                {membership && (
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                        membership.status === 'active' ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"
                                    )}>
                                        {membership.plan} — {membership.status}
                                    </span>
                                )}
                                {compliance?.terms_accepted && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300">
                                        T&C Aceptados
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Info */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <User size={14} />
                            Información de Contacto
                        </h3>
                        <dl className="bg-gray-50 rounded-2xl px-5">
                            <DataField label="Nombre real" value={contact.real_name} />
                            <DataField label="Nombre WhatsApp" value={contact.push_name} />
                            {contact.nickname && <DataField label="Apodo" value={contact.nickname} />}
                            <DataField label="Teléfono" value={contact.phone} icon={Phone} mono />
                            {contact.alternative_chat_id && (
                                <DataField label="Chat ID alternativo" value={contact.alternative_chat_id} mono />
                            )}
                        </dl>
                    </section>

                    {/* Activity */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Activity size={14} />
                            Actividad
                        </h3>
                        <dl className="bg-gray-50 rounded-2xl px-5">
                            <DataField
                                label="Primera interacción"
                                value={contact.first_seen ? new Date(contact.first_seen).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
                                icon={Calendar}
                            />
                            <DataField
                                label="Última actividad"
                                value={lastActivity ? new Date(lastActivity).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null}
                                icon={Clock}
                            />
                            {trialStatus && (
                                <DataField label="Trial" value={trialStatus} />
                            )}
                            {contact.trial_started_at && (
                                <DataField
                                    label="Inicio del trial"
                                    value={new Date(contact.trial_started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                />
                            )}
                        </dl>
                    </section>
                </div>
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Tag size={14} />
                        Tags ({contact.tags.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag: string) => (
                            <span key={tag} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Notes */}
            {contact.notes && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} />
                        Notas
                    </h3>
                    <div className="bg-gray-50 rounded-2xl p-5">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
                    </div>
                </div>
            )}

            {/* Membership Details */}
            {membership && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <CreditCard size={14} />
                        Membresía
                    </h3>
                    <dl className="bg-gray-50 rounded-2xl px-5">
                        <DataField label="Plan" value={membership.plan} />
                        <DataField label="Estado" value={membership.status} />
                        <DataField
                            label="Inicio"
                            value={membership.started_at ? new Date(membership.started_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
                        />
                        <DataField
                            label="Expiración"
                            value={membership.expires_at ? new Date(membership.expires_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null}
                        />
                        {membership.notes && <DataField label="Notas" value={membership.notes} />}
                    </dl>
                </div>
            )}

            {/* Compliance */}
            {compliance && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} />
                        Cumplimiento (T&C)
                    </h3>
                    <dl className="bg-gray-50 rounded-2xl px-5">
                        <DataField label="Estado" value={compliance.terms_accepted ? '✅ Aceptado' : '⏳ Pendiente'} />
                        <DataField
                            label="Fecha de aceptación"
                            value={compliance.accepted_at ? new Date(compliance.accepted_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null}
                        />
                        <DataField label="IP" value={compliance.ip_address} mono />
                    </dl>
                </div>
            )}


            {/* Attributes (raw JSON) */}
            {contact.attributes && Object.keys(contact.attributes).length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Atributos</h3>
                    <pre className="bg-gray-50 rounded-2xl p-5 text-xs text-gray-600 overflow-x-auto font-mono">
                        {JSON.stringify(contact.attributes, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}
