'use client'

import { useTranslation } from '@/lib/i18n/useTranslation'
import { Target, Sparkles, ArrowRight, Flag } from 'lucide-react'
import { ReactNode } from 'react'
import { GoalFormDialog } from './GoalFormDialog'

interface GoalsPageClientProps {
    totalGoals: number
    completed: number
    active: number
    totalKrs: number
    companyId: string
    goals: any[]
    children: ReactNode
}

export function GoalsPageClient({ totalGoals, completed, active, totalKrs, companyId, goals, children }: GoalsPageClientProps) {
    const { t } = useTranslation()

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('goals.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('goals.subtitle')}</p>
                </div>
                <GoalFormDialog companyId={companyId} />
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
                            ? t('goals.defineFirst')
                            : `${totalGoals} ${t('goals.objectives')} · ${completed} ${t('goals.completed')} · ${totalKrs} KRs`
                        }
                    </h2>
                    <p className="text-blue-100 mb-6 leading-relaxed">
                        {totalGoals === 0
                            ? t('goals.defineFirstHint')
                            : active > 0
                                ? `${active} ${t('goals.activeGoals')}`
                                : t('goals.allCompleted')
                        }
                    </p>
                    <button className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm flex items-center gap-2 text-sm">
                        {totalGoals === 0 ? t('goals.createFirst') : t('goals.talkToNova')}
                        <ArrowRight size={16} />
                    </button>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 translate-x-20" />
                <Target size={200} className="absolute -right-20 -bottom-20 text-white/10 rotate-12" />
            </div>

            {/* Goals Grid from children, with empty state override */}
            {goals.length === 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2 p-20 text-center bg-white rounded-3xl border border-gray-100 border-dashed">
                        <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag size={32} />
                        </div>
                        <p className="font-bold text-gray-900">{t('goals.defineYourFirst')}</p>
                        <p className="text-sm text-gray-500 mb-6">{t('goals.whatToAchieve')}</p>
                        <GoalFormDialog companyId={companyId} />
                    </div>
                </div>
            ) : (
                children
            )}
        </div>
    )
}
