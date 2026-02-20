import { createClient } from '@/lib/supabase/server'
import { getCompanyByDomain } from '@/lib/data/companies'
import { headers } from 'next/headers'
import { Target, Flag, Sparkles, ArrowRight } from 'lucide-react'
import { getCompanyGoals } from '@/lib/actions/goals'
import { GoalFormDialog } from './_components/GoalFormDialog'
import { GoalCard } from './_components/GoalCard'

export default async function GoalsPage() {
    const supabase = await createClient()
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const domain = host.split('.')[0]

    const company = await getCompanyByDomain(supabase, domain)
    if (!company) {
        return <div className="p-8 text-red-500">No se pudo cargar la empresa.</div>
    }

    const goals = await getCompanyGoals(company.id)

    const totalGoals = goals.length
    const completed = goals.filter((g: any) => g.status === 'completed').length
    const active = totalGoals - completed
    const totalKrs = goals.reduce((sum: number, g: any) => sum + (Array.isArray(g.krs) ? g.krs.length : 0), 0)

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Metas y OKRs</h1>
                    <p className="text-gray-500 mt-1">Sigue tus objetivos estratégicos y resultados clave con Nova.</p>
                </div>
                <GoalFormDialog companyId={company.id} />
            </div>

            {/* AI Coaching Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-600/10">
                <div className="relative z-10 max-w-xl">
                    <div className="flex items-center gap-2 mb-4 bg-white/10 w-fit px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                        <Sparkles size={14} />
                        <span>Nova Active Coaching</span>
                    </div>
                    <h2 className="text-2xl font-black mb-2">
                        {totalGoals === 0
                            ? '¡Define tu primer objetivo!'
                            : `${totalGoals} objetivos · ${completed} completados · ${totalKrs} KRs`
                        }
                    </h2>
                    <p className="text-blue-100 mb-6 leading-relaxed">
                        {totalGoals === 0
                            ? 'Empieza definiendo qué quieres lograr en los próximos 90 días. Nova te ayudará a mantener el foco.'
                            : active > 0
                                ? `Tienes ${active} objetivo${active > 1 ? 's' : ''} activo${active > 1 ? 's' : ''}. Nova puede ayudarte a definir resultados clave para avanzar más rápido.`
                                : '¡Felicidades! Todos tus objetivos están completados. ¿Listos para los siguientes?'
                        }
                    </p>
                    <button className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm flex items-center gap-2 text-sm">
                        {totalGoals === 0 ? 'Crear primer objetivo' : 'Hablar con Nova'}
                        <ArrowRight size={16} />
                    </button>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 translate-x-20" />
                <Target size={200} className="absolute -right-20 -bottom-20 text-white/10 rotate-12" />
            </div>

            {/* Goals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {goals.map((goal: any) => (
                    <GoalCard key={goal.id} goal={goal} companyId={company.id} />
                ))}

                {goals.length === 0 && (
                    <div className="lg:col-span-2 p-20 text-center bg-white rounded-3xl border border-gray-100 border-dashed">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag size={32} />
                        </div>
                        <p className="font-bold text-gray-900">Define tu primer objetivo</p>
                        <p className="text-sm text-gray-500 mb-6">¿Qué quieres lograr en los próximos 90 días?</p>
                        <GoalFormDialog companyId={company.id} />
                    </div>
                )}
            </div>
        </div>
    )
}
