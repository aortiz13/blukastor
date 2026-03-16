'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Archive, ArchiveRestore, Trash2, AlertTriangle } from 'lucide-react'
import { archiveProject, unarchiveProject, deleteProject } from '@/lib/actions/projects'

interface ProjectActionsProps {
    projectId: string
    projectName: string
    isActive: boolean
}

export function ProjectActions({ projectId, projectName, isActive }: ProjectActionsProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [archived, setArchived] = useState(!isActive)
    const [confirmName, setConfirmName] = useState('')
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    const handleArchiveToggle = () => {
        const newArchived = !archived
        setArchived(newArchived)
        startTransition(async () => {
            try {
                if (newArchived) {
                    await archiveProject(projectId)
                } else {
                    await unarchiveProject(projectId)
                }
                router.refresh()
            } catch (err: any) {
                setArchived(!newArchived) // revert
                console.error('Archive toggle error:', err)
            }
        })
    }

    const handleDelete = () => {
        setDeleteError(null)
        startTransition(async () => {
            try {
                await deleteProject(projectId, confirmName)
                router.push('/projects')
            } catch (err: any) {
                setDeleteError(err.message || 'Error al eliminar el proyecto')
            }
        })
    }

    const nameMatches = confirmName.trim().toLowerCase() === projectName.trim().toLowerCase()

    return (
        <div className="space-y-6">
            {/* Archive Section */}
            <Card className="border-amber-200 bg-amber-50/30">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        {archived ? (
                            <ArchiveRestore className="w-5 h-5 text-amber-600" />
                        ) : (
                            <Archive className="w-5 h-5 text-amber-600" />
                        )}
                        Archivar Proyecto
                    </CardTitle>
                    <CardDescription>
                        Al archivar un proyecto, este dejará de aparecer en la lista principal de proyectos.
                        Podrás restaurarlo en cualquier momento.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="archive-switch" className="text-sm font-medium">
                                {archived ? 'Proyecto archivado' : 'Proyecto activo'}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {archived
                                    ? 'Este proyecto está archivado y no aparece en la lista.'
                                    : 'Este proyecto está activo y visible en la lista.'}
                            </p>
                        </div>
                        <Switch
                            id="archive-switch"
                            checked={archived}
                            onCheckedChange={handleArchiveToggle}
                            disabled={isPending}
                            className="data-[state=checked]:bg-amber-500"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Delete Section */}
            <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                        <Trash2 className="w-5 h-5" />
                        Zona de Peligro
                    </CardTitle>
                    <CardDescription>
                        La eliminación de un proyecto es <strong>permanente e irreversible</strong>. 
                        Se borrarán todas las metas, transacciones financieras, miembros del equipo e invitaciones asociadas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
                        setDeleteDialogOpen(open)
                        if (!open) {
                            setConfirmName('')
                            setDeleteError(null)
                        }
                    }}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="gap-2">
                                <Trash2 className="w-4 h-4" />
                                Eliminar Proyecto Definitivamente
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="w-5 h-5" />
                                    ¿Estás seguro?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-3">
                                    <p>
                                        Esta acción <strong>no se puede deshacer</strong>. Se eliminarán permanentemente
                                        todos los datos asociados a este proyecto:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        <li>Metas y objetivos</li>
                                        <li>Transacciones financieras</li>
                                        <li>Presupuestos</li>
                                        <li>Miembros del equipo</li>
                                        <li>Invitaciones pendientes</li>
                                        <li>Contexto del negocio</li>
                                    </ul>
                                    <div className="pt-2">
                                        <p className="text-sm font-medium text-gray-900 mb-2">
                                            Para confirmar, escribe el nombre del proyecto: <strong className="text-red-600">{projectName}</strong>
                                        </p>
                                        <Input
                                            value={confirmName}
                                            onChange={(e) => setConfirmName(e.target.value)}
                                            placeholder={projectName}
                                            className="border-red-200 focus:border-red-400 focus:ring-red-400"
                                        />
                                    </div>
                                    {deleteError && (
                                        <p className="text-sm text-red-600 font-medium bg-red-50 rounded-md px-3 py-2">
                                            {deleteError}
                                        </p>
                                    )}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={!nameMatches || isPending}
                                    className="gap-2"
                                >
                                    {isPending ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Eliminando...
                                        </span>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Eliminar Definitivamente
                                        </>
                                    )}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    )
}
