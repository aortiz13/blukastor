import { createClient } from '@/lib/supabase/server'
import { getMyTeams } from '@/lib/actions/project-sharing'
import { getCompanyByDomain } from '@/lib/data/companies'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Users,
    ShieldCheck,
    Shield,
    ArrowRight,
    Briefcase,
    Home,
    FolderKanban,
    User as UserIcon,
    MoreHorizontal,
    Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const kindConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    business: { label: 'Empresa', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    family: { label: 'Familia', icon: Home, color: 'text-pink-600', bg: 'bg-pink-50' },
    project: { label: 'Proyecto', icon: FolderKanban, color: 'text-violet-600', bg: 'bg-violet-50' },
    personal: { label: 'Personal', icon: UserIcon, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    other: { label: 'Otro', icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-50' },
}

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
    owner: { label: 'Propietario', color: 'text-blue-700', bg: 'bg-blue-50' },
    editor: { label: 'Editor', color: 'text-amber-700', bg: 'bg-amber-50' },
    viewer: { label: 'Visualizador', color: 'text-gray-600', bg: 'bg-gray-100' },
}

export default async function MyTeamsPage({
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
    if (!company) return <div>Empresa no encontrada</div>

    const teams = await getMyTeams()

    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Mis Equipos</h1>
                <p className="text-gray-500 mt-1">
                    Todos los proyectos y equipos a los que perteneces.
                </p>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Equipos</p>
                        <p className="text-2xl font-black text-gray-900">{teams.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Como Owner</p>
                        <p className="text-2xl font-black text-gray-900">
                            {teams.filter((t: any) => t.role === 'owner').length}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                        <Shield size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Colaborador</p>
                        <p className="text-2xl font-black text-gray-900">
                            {teams.filter((t: any) => t.role !== 'owner').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Team Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team: any) => {
                    const kind = kindConfig[team.company_kind] || kindConfig.other
                    const role = roleConfig[team.role] || roleConfig.viewer
                    const KindIcon = kind.icon

                    return (
                        <Link key={team.project_id} href={`/${domain}/projects/${team.project_id}`}>
                            <Card className="hover:shadow-md transition-all cursor-pointer h-full border-gray-100 group hover:border-gray-200">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-base font-bold text-gray-900 truncate">
                                            {team.project_name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold ${kind.color} ${kind.bg} px-2 py-0.5 rounded-full`}>
                                                <KindIcon size={10} />
                                                {kind.label}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold ${role.color} ${role.bg} px-2 py-0.5 rounded-full`}>
                                                {team.role === 'owner' ? <ShieldCheck size={10} /> : <Shield size={10} />}
                                                {role.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`p-2 ${kind.bg} rounded-lg ${kind.color} shrink-0`}>
                                        <KindIcon size={16} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Users size={12} />
                                                {team.member_count} {team.member_count === 1 ? 'miembro' : 'miembros'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(team.joined_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <ArrowRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}

                {teams.length === 0 && (
                    <Card className="col-span-full border-dashed border-2 bg-gray-50/50">
                        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <Users size={48} className="mb-4 opacity-20" />
                            <h3 className="font-bold text-lg text-gray-900 mb-1">No perteneces a ningún equipo aún</h3>
                            <p className="text-sm max-w-xs mx-auto">
                                Cuando alguien te invite a un proyecto, aparecerá aquí.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
