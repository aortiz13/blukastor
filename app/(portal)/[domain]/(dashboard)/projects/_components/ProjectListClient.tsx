'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, ArrowRight, Shield, ShieldCheck, Archive } from 'lucide-react'
import Link from 'next/link'
import { ProjectForm } from './ProjectForm'

interface Project {
    id: string
    name: string
    created_at: string
    is_active: boolean
    role: string
}

type FilterStatus = 'all' | 'active' | 'archived'

interface ProjectListClientProps {
    projects: Project[]
    companyId: string
    domain: string
}

export function ProjectListClient({ projects, companyId, domain }: ProjectListClientProps) {
    const [filter, setFilter] = useState<FilterStatus>('active')

    const filteredProjects = projects.filter((p) => {
        if (filter === 'active') return p.is_active
        if (filter === 'archived') return !p.is_active
        return true // 'all'
    })

    const activeCount = projects.filter(p => p.is_active).length
    const archivedCount = projects.filter(p => !p.is_active).length

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Proyectos</h2>
                <div className="flex items-center space-x-2">
                    <ProjectForm companyId={companyId} domain={domain} />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
                <Button
                    variant={filter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('active')}
                    className="gap-1.5"
                >
                    <Briefcase size={14} />
                    Activos
                    <span className="ml-1 text-xs bg-white/20 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {activeCount}
                    </span>
                </Button>
                <Button
                    variant={filter === 'archived' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('archived')}
                    className="gap-1.5"
                >
                    <Archive size={14} />
                    Archivados
                    <span className="ml-1 text-xs bg-white/20 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {archivedCount}
                    </span>
                </Button>
                <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                    className="gap-1.5"
                >
                    Todos
                    <span className="ml-1 text-xs bg-white/20 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {projects.length}
                    </span>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                        <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${
                            !project.is_active
                                ? 'border-amber-200 bg-amber-50/30 opacity-80'
                                : 'border-gray-100'
                        }`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {project.name}
                                </CardTitle>
                                <div className={`p-2 rounded-lg ${
                                    !project.is_active
                                        ? 'bg-amber-50 text-amber-600'
                                        : 'bg-blue-50 text-blue-600'
                                }`}>
                                    {!project.is_active ? <Archive size={16} /> : <Briefcase size={16} />}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground mb-4">
                                    Creado el {new Date(project.created_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-2">
                                        {project.role === 'owner' ? (
                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                <ShieldCheck size={10} /> Owner
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                <Shield size={10} /> {project.role}
                                            </span>
                                        )}
                                        {!project.is_active && (
                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                <Archive size={10} /> Archivado
                                            </span>
                                        )}
                                    </div>
                                    <ArrowRight size={16} className="text-gray-300" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {filteredProjects.length === 0 && (
                    <Card className="col-span-full border-dashed border-2 bg-gray-50/50">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            {filter === 'archived' ? (
                                <>
                                    <Archive size={48} className="mb-4 opacity-20" />
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">No hay proyectos archivados</h3>
                                    <p className="text-sm max-w-xs mx-auto">
                                        Los proyectos que archives aparecerán aquí.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Briefcase size={48} className="mb-4 opacity-20" />
                                    <h3 className="font-bold text-lg text-gray-900 mb-1">No hay proyectos aún</h3>
                                    <p className="text-sm max-w-xs mx-auto mb-6">
                                        Comienza creando un nuevo proyecto para gestionar tus metas y finanzas.
                                    </p>
                                    <ProjectForm companyId={companyId} domain={domain} />
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
