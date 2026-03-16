'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { upsertGoal } from '@/lib/actions/projects'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface GoalFormProps {
    projectId: string
    goal?: any
    onSuccess?: () => void
}

export function GoalForm({ projectId, goal, onSuccess }: GoalFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { t } = useTranslation()

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const title = formData.get('title') as string
        const description = formData.get('description') as string
        const priority = formData.get('priority') as any
        const deadline = formData.get('deadline') as string

        try {
            await upsertGoal({
                id: goal?.id,
                projectId,
                title,
                description,
                priority,
                deadline: deadline || undefined,
            })
            toast.success(goal ? t('goalForm.updated') : t('goalForm.created'))
            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error: any) {
            toast.error(error.message || t('goalForm.saveError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {goal ? (
                    <Button variant="ghost" size="sm">{t('goalForm.edit')}</Button>
                ) : (
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" /> {t('goalForm.newGoal')}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{goal ? t('goalForm.editTitle') : t('goalForm.createTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('goalForm.dialogDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">{t('goalForm.title')}</Label>
                            <Input id="title" name="title" defaultValue={goal?.title} placeholder={t('goalForm.titlePlaceholder')} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('goalForm.description')}</Label>
                            <Textarea id="description" name="description" defaultValue={goal?.description} placeholder={t('goalForm.descPlaceholder')} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="priority">{t('goalForm.priority')}</Label>
                                <Select name="priority" defaultValue={goal?.priority || 'medium'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('goalForm.selectPriority')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">{t('goalForm.low')}</SelectItem>
                                        <SelectItem value="medium">{t('goalForm.medium')}</SelectItem>
                                        <SelectItem value="high">{t('goalForm.high')}</SelectItem>
                                        <SelectItem value="critical">{t('goalForm.critical')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deadline">{t('goalForm.deadline')}</Label>
                                <Input id="deadline" name="deadline" type="date" defaultValue={goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : ''} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? t('goalForm.saving') : t('goalForm.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
