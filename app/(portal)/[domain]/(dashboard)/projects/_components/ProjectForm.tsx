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

interface ProjectFormProps {
    companyId: string
    domain: string
}

export function ProjectForm({ companyId, domain }: ProjectFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const name = formData.get('name') as string
        const description = formData.get('description') as string

        try {
            const project = await createProject(companyId, name, description)
            toast.success('Proyecto creado con éxito')
            setOpen(false)
            router.push(`/${domain}/projects/${project.id}`)
        } catch (error: any) {
            toast.error(error.message || 'Error al crear proyecto')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Proyecto
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form action={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                        <DialogDescription>
                            Define un nuevo proyecto para gestionar tus metas y finanzas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Proyecto</Label>
                            <Input id="name" name="name" placeholder="Ej: Nueva Sucursal, App Móvil" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción (Opcional)</Label>
                            <Textarea id="description" name="description" placeholder="Breve descripción del objetivo de este proyecto" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Creando...' : 'Crear Proyecto'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
