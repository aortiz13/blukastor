import { createClient } from '@/lib/supabase/server'
import { getUserProjects } from '@/lib/actions/project-sharing'
import { getCompanyByDomain } from '@/lib/data/companies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Plus, ArrowRight, Shield, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ProjectForm } from './_components/ProjectForm'

export default async function ProjectsPage({
    params,
}: {
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/${domain}/login`)

    const company = await getCompanyByDomain(supabase, domain)
    if (!company) return <div>Company not found</div>

    const projects = await getUserProjects()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Proyectos</h2>
                <div className="flex items-center space-x-2">
                    <ProjectForm companyId={company.id} domain={domain} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project: any) => (
                    <Link key={project.id} href={`/${domain}/projects/${project.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-gray-100">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {project.name}
                                </CardTitle>
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Briefcase size={16} />
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
                                    </div>
                                    <ArrowRight size={16} className="text-gray-300" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {projects.length === 0 && (
                    <Card className="col-span-full border-dashed border-2 bg-gray-50/50">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <Briefcase size={48} className="mb-4 opacity-20" />
                            <h3 className="font-bold text-lg text-gray-900 mb-1">No hay proyectos aún</h3>
                            <p className="text-sm max-w-xs mx-auto mb-6">
                                Comienza creando un nuevo proyecto para gestionar tus metas y finanzas.
                            </p>
                            <ProjectForm companyId={company.id} domain={domain} />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
