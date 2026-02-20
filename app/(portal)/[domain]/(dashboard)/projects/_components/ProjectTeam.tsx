import { createClient } from '@/lib/supabase/server'
import { Users, Mail, Shield, ShieldCheck, Clock, Link as LinkIcon } from 'lucide-react'
import { getProjectMembers, getProjectInvites } from '@/lib/actions/project-sharing'
import { InviteMemberModal, RevokeInviteButton, RemoveMemberButton } from '../../team/invite-modal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export async function ProjectTeam({ projectId }: { projectId: string }) {
    const supabase = await createClient()
    const members = await getProjectMembers(projectId)
    const invites = await getProjectInvites(projectId)

    // Unify lists
    const unifiedList = [
        ...(members || []).map((m: any) => ({
            ...m,
            type: 'member',
            status: 'active',
            displayEmail: m.email,
            displayName: m.name || m.email?.split('@')[0],
            initials: (m.name?.[0] || m.email?.[0] || 'U').toUpperCase()
        })),
        ...(invites || []).map((i: any) => ({
            id: i.id,
            role: i.role,
            created_at: i.created_at,
            type: 'invite',
            status: 'pending',
            channel: i.channel,
            displayEmail: i.channel === 'link' ? 'Enlace de Invitación' : i.email,
            displayName: i.channel === 'link' ? 'Link Generado' : 'Invitado',
            initials: i.channel === 'link' ? 'L' : (i.email?.[0] || 'I').toUpperCase()
        }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="flex flex-row items-center justify-between px-0">
                    <div>
                        <CardTitle className="text-2xl">Equipo del Proyecto</CardTitle>
                        <CardDescription>Gestiona quién tiene acceso a este proyecto y sus permisos.</CardDescription>
                    </div>
                    <InviteMemberModal projectId={projectId} />
                </CardHeader>
                <CardContent className="px-0">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/30">
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Miembro</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rol</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Desde</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {unifiedList.map((item: any) => (
                                    <tr key={item.id} className="group hover:bg-gray-50/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase ${item.type === 'invite'
                                                    ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                                    : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
                                                    }`}>
                                                    {item.channel === 'link' ? <LinkIcon size={16} /> : item.initials}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 line-clamp-1">{item.displayName}</p>
                                                    <p className="text-xs text-gray-400">{item.displayEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {item.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 tracking-wide uppercase">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 tracking-wide uppercase">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                                                    Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {item.role === 'owner' ? (
                                                    <ShieldCheck size={14} className="text-blue-600" />
                                                ) : (
                                                    <Shield size={14} className="text-gray-400" />
                                                )}
                                                <span className="text-sm font-bold text-gray-700 capitalize">{item.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-500 font-mono">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {item.type === 'member' && item.role !== 'owner' && (
                                                <RemoveMemberButton memberId={item.id} />
                                            )}
                                            {item.type === 'invite' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <RevokeInviteButton inviteId={item.id} />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {unifiedList.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12 text-gray-400">
                                            <Users size={32} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">No hay miembros ni invitaciones.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
