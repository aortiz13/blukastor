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
import { Plus, Loader2 } from "lucide-react"
import { createProject } from '@/lib/actions/projects'
import { toast } from 'sonner'
import { useRouter, useParams } from 'next/navigation'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface ProjectFormProps {
    companyId: string
    domain: string
}

export function ProjectForm({ companyId, domain }: ProjectFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { t } = useTranslation()

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const name = formData.get('name') as string
        const description = formData.get('description') as string

        try {
            const project = await createProject(companyId, name, description)
            toast.success(t('project.createdSuccess'))
            setOpen(false)
            router.push(`/projects/${project.id}`)
        } catch (error: any) {
            toast.error(error.message || t('project.createError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('project.newProject')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t('project.createTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('project.createDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('project.nameLabel')}</Label>
                            <Input id="name" name="name" placeholder={t('project.namePlaceholder')} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('project.descLabel')}</Label>
                            <Textarea id="description" name="description" placeholder={t('project.descPlaceholder')} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? t('common.creating') : t('project.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
