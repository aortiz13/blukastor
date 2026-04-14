'use client'

import { useState } from 'react'
import { Plus, Loader2, Pencil, X } from 'lucide-react'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader,
    DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createGoal, updateGoal } from '@/lib/actions/goals'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface GoalFormDialogProps {
    companyId: string
    goal?: any
    trigger?: React.ReactNode
}

export function GoalFormDialog({ companyId, goal, trigger }: GoalFormDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [krs, setKrs] = useState<string[]>(goal?.krs || [])
    const [newKr, setNewKr] = useState('')
    const router = useRouter()
    const { t } = useTranslation()

    const isEdit = !!goal

    const addKr = () => {
        const trimmed = newKr.trim()
        if (!trimmed) return
        setKrs((prev) => [...prev, trimmed])
        setNewKr('')
    }

    const removeKr = (index: number) => {
        setKrs((prev) => prev.filter((_, i) => i !== index))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            addKr()
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const form = new FormData(e.currentTarget)
        const title = form.get('title') as string
        const description = form.get('description') as string
        const target = form.get('target') as string
        const priority = form.get('priority') as 'low' | 'medium' | 'high' | 'critical'
        const scope = form.get('scope') as 'personal' | 'company'
        const deadline = form.get('deadline') as string

        try {
            if (isEdit) {
                await updateGoal(goal.id, {
                    title,
                    description: description || null,
                    target: target || null,
                    priority,
                    scope,
                    deadline: deadline || null,
                    krs: krs.length > 0 ? krs : null,
                })
                toast.success(t('goal.updated'))
            } else {
                await createGoal({
                    companyId,
                    title,
                    description: description || undefined,
                    target: target || undefined,
                    priority,
                    scope,
                    deadline: deadline || undefined,
                    krs: krs.length > 0 ? krs : undefined,
                })
                toast.success(t('goal.created'))
            }
            setOpen(false)
            setKrs([])
            setNewKr('')
            router.refresh()
        } catch (err: any) {
            toast.error(err.message || t('common.errorSaving'))
        } finally {
            setLoading(false)
        }
    }

    // Reset KRs when dialog opens with a goal
    const handleOpenChange = (v: boolean) => {
        setOpen(v)
        if (v) {
            setKrs(goal?.krs || [])
            setNewKr('')
        }
    }

    const defaultTrigger = isEdit ? (
        <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
            <Pencil size={16} />
        </button>
    ) : (
        <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition shadow-lg shadow-black/5 text-sm">
            <Plus size={18} />
            <span>{t('goal.newGoal')}</span>
        </button>
    )

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? t('goal.editGoal') : t('goal.newGoal')}</DialogTitle>
                        <DialogDescription>
                            {isEdit ? t('goal.editDesc') : t('goal.createDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">{t('goal.titleLabel')}</Label>
                            <Input
                                id="title"
                                name="title"
                                defaultValue={goal?.title}
                                placeholder={t('goal.titlePlaceholder')}
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('goal.descriptionLabel')}</Label>
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={goal?.description}
                                placeholder={t('goal.descriptionPlaceholder')}
                                rows={2}
                            />
                        </div>

                        {/* Target */}
                        <div className="space-y-2">
                            <Label htmlFor="target">{t('goal.targetLabel')}</Label>
                            <Input
                                id="target"
                                name="target"
                                defaultValue={goal?.target}
                                placeholder={t('goal.targetPlaceholder')}
                            />
                            <p className="text-[11px] text-gray-400">{t('goal.targetHint')}</p>
                        </div>

                        {/* Priority + Scope */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="priority">{t('goal.priorityLabel')}</Label>
                                <Select name="priority" defaultValue={goal?.priority || 'medium'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('common.select')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t('goal.priorityLow')}</SelectItem>
                                        <SelectItem value="medium">{t('goal.priorityMedium')}</SelectItem>
                                        <SelectItem value="high">{t('goal.priorityHigh')}</SelectItem>
                                        <SelectItem value="critical">{t('goal.priorityCritical')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="scope">{t('goal.scopeLabel')}</Label>
                                <Select name="scope" defaultValue={goal?.scope || 'company'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('common.select')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="personal">{t('goal.personal')}</SelectItem>
                                        <SelectItem value="company">{t('goal.company')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Deadline */}
                        <div className="space-y-2">
                            <Label htmlFor="deadline">{t('goal.deadlineLabel')}</Label>
                            <Input
                                id="deadline"
                                name="deadline"
                                type="date"
                                defaultValue={goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : ''}
                            />
                        </div>

                        {/* Key Results */}
                        <div className="space-y-2">
                            <Label>{t('goal.keyResults')}</Label>
                            <div className="space-y-2">
                                {krs.map((kr, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="text-xs font-bold text-blue-600 flex-shrink-0">KR{i + 1}</span>
                                        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{kr}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeKr(i)}
                                            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    value={newKr}
                                    onChange={(e) => setNewKr(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={t('goal.krPlaceholder')}
                                    className="flex-1"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={addKr} disabled={!newKr.trim()}>
                                    <Plus size={14} className="mr-1" /> {t('common.add')}
                                </Button>
                            </div>
                            <p className="text-[11px] text-gray-400">{t('common.enterPressHint')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? t('common.saving') : isEdit ? t('common.saveChanges') : t('goal.createGoal')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
