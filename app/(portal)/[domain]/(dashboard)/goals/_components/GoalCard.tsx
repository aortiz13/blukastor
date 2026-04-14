'use client'

import { useState } from 'react'
import {
    Target, Flag, Calendar, Trash2, CheckCircle2,
    MoreHorizontal, RotateCcw, Circle,
} from 'lucide-react'
import { GoalFormDialog } from './GoalFormDialog'
import { removeGoal, updateGoal } from '@/lib/actions/goals'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface GoalCardProps {
    goal: any
    companyId: string
}

const PRIORITY_STYLES: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-600',
}

const PRIORITY_LABELS_KEYS: Record<string, string> = {
    critical: 'goal.priorityCritical',
    high: 'goal.priorityHigh',
    medium: 'goal.priorityMedium',
    low: 'goal.priorityLow',
}

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    paused: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS_KEYS: Record<string, string> = {
    active: 'goal.statusActive',
    in_progress: 'goal.statusInProgress',
    completed: 'goal.statusCompleted',
    paused: 'goal.statusPaused',
}

export function GoalCard({ goal, companyId }: GoalCardProps) {
    const [showMenu, setShowMenu] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const router = useRouter()
    const { t } = useTranslation()

    const status = goal.status || 'active'
    const priority = goal.priority || 'medium'
    const isCompleted = status === 'completed'
    const krs: string[] = Array.isArray(goal.krs) ? goal.krs : []

    const handleDelete = async () => {
        if (!confirm(t('goal.confirmDelete'))) return
        setDeleting(true)
        try {
            await removeGoal(goal.id)
            toast.success(t('goal.deleted'))
            router.refresh()
        } catch {
            toast.error(t('goal.deleteError'))
        } finally {
            setDeleting(false)
        }
    }

    const toggleStatus = async () => {
        const nextStatus = isCompleted ? 'active' : 'completed'
        try {
            await updateGoal(goal.id, { status: nextStatus })
            toast.success(isCompleted ? t('goal.reopened') : t('goal.completed'))
            router.refresh()
        } catch {
            toast.error(t('goal.statusError'))
        }
        setShowMenu(false)
    }

    const formattedDeadline = goal.deadline
        ? new Date(goal.deadline + 'T00:00:00').toLocaleDateString('es-CL', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
        : null

    return (
        <div className={cn(
            "bg-white rounded-3xl border border-gray-100 shadow-sm p-8 hover:shadow-md transition-shadow flex flex-col group relative",
            isCompleted && "opacity-60"
        )}>
            {/* Top row: Icon + Status + Menu */}
            <div className="flex justify-between items-start mb-5">
                <div className={cn(
                    "p-4 rounded-2xl transition-colors",
                    isCompleted
                        ? "bg-green-50 text-green-600"
                        : "bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                )}>
                    {isCompleted ? <CheckCircle2 size={24} /> : <Target size={24} />}
                </div>

                <div className="flex items-center gap-2">
                    <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        STATUS_STYLES[status] || STATUS_STYLES.active
                    )}>
                        {t(STATUS_LABELS_KEYS[status] || 'goal.statusActive')}
                    </span>

                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 w-48 z-20">
                                    <GoalFormDialog
                                        companyId={companyId}
                                        goal={goal}
                                        trigger={
                                            <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2.5 text-gray-700">
                                                <Target size={14} />
                                                {t('common.edit')}
                                            </button>
                                        }
                                    />
                                    <button
                                        onClick={toggleStatus}
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2.5 text-gray-700"
                                    >
                                        {isCompleted ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                                        {isCompleted ? t('goal.reopen') : t('goal.markComplete')}
                                    </button>
                                    <hr className="my-1 border-gray-100" />
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 transition-colors flex items-center gap-2.5 text-red-500"
                                    >
                                        <Trash2 size={14} />
                                        {deleting ? t('common.deleting') : t('common.delete')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Title + Description */}
            <h3 className={cn(
                "text-xl font-black text-gray-900 mb-1",
                isCompleted && "line-through"
            )}>
                {goal.title}
            </h3>
            {goal.description && (
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    {goal.description}
                </p>
            )}

            {/* Target badge */}
            {goal.target && (
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target</span>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                        {goal.target}
                    </span>
                </div>
            )}

            {/* Key Results */}
            {krs.length > 0 && (
                <div className="space-y-2 mb-6 flex-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('goal.keyResults')}</span>
                    <div className="space-y-1.5">
                        {krs.map((kr, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm">
                                <Circle size={8} className={cn(
                                    "mt-1.5 flex-shrink-0",
                                    isCompleted ? "text-green-500 fill-green-500" : "text-blue-400"
                                )} />
                                <span className={cn(
                                    "text-gray-600 leading-relaxed",
                                    isCompleted && "line-through text-gray-400"
                                )}>
                                    {kr}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* If no KRs and no description, add spacer */}
            {krs.length === 0 && !goal.description && <div className="flex-1" />}

            {/* Priority + Scope + Deadline */}
            <div className="flex items-center flex-wrap gap-3 pt-5 border-t border-gray-50 text-[10px] font-bold uppercase tracking-widest">
                <span className={cn(
                    "px-2.5 py-1 rounded-full",
                    PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium
                )}>
                    {t(PRIORITY_LABELS_KEYS[priority] || 'goal.priorityMedium')}
                </span>
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Flag size={14} />
                    <span>{goal.scope === 'personal' ? t('goal.personal') : t('goal.company')}</span>
                </div>
                {formattedDeadline && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                        <Calendar size={14} />
                        <span>{formattedDeadline}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
