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

interface GoalFormProps {
    projectId: string
    goal?: any
    onSuccess?: () => void
}

export function GoalForm({ projectId, goal, onSuccess }: GoalFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

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
            toast.success(goal ? 'Meta actualizada' : 'Meta creada')
            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error: any) {
            toast.error(error.message || 'Error al guardar meta')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {goal ? (
                    <Button variant="ghost" size="sm">Editar</Button>
                ) : (
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Nueva Meta
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{goal ? 'Editar Meta' : 'Crear Nueva Meta'}</DialogTitle>
                        <DialogDescription>
                            Define objetivos claros para tu proyecto.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input id="title" name="title" defaultValue={goal?.title} placeholder="Ej: Lanzar MVP, Alcanzar 100 clientes" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Textarea id="description" name="description" defaultValue={goal?.description} placeholder="Detalles sobre cómo alcanzar esta meta" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="priority">Prioridad</Label>
                                <Select name="priority" defaultValue={goal?.priority || 'medium'}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Baja</SelectItem>
                                        <SelectItem value="medium">Media</SelectItem>
                                        <SelectItem value="high">Alta</SelectItem>
                                        <SelectItem value="critical">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deadline">Fecha Límite</Label>
                                <Input id="deadline" name="deadline" type="date" defaultValue={goal?.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : ''} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Guardando...' : 'Guardar Meta'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
