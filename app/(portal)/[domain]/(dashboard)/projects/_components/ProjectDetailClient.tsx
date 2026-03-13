'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, Clock, Briefcase, Palette } from 'lucide-react'
import Link from 'next/link'
import { GoalList } from './GoalList'
import { GoalForm } from './GoalForm'
import { ProjectTeam } from './ProjectTeam'
import { ProjectFinance } from './ProjectFinance'
import { ProjectDetails } from './ProjectDetails'
import { ProjectBusiness } from './ProjectBusiness'
import { FloatingChat } from '@/components/chat/floating-chat'
import { CorporateBrandingForm } from '@/app/corporate/branding/corporate-branding-form'

interface ProjectDetailClientProps {
    domain: string
    project: any
    goals: any[]
    transactions: any[]
    companyCurrency: string
    chatContactId: string | null
    companyContext: any | null
    teamMembers: any[]
    teamInvites: any[]
}

// Map tab values to agent types
const TAB_AGENT_MAP: Record<string, string> = {
    details: 'business',      // Más detalles → business agent (gathers company info)
    goals: 'goals',
    finances: 'finance',
    team: 'onboarding',       // Team → general agent
    branding: 'onboarding',   // Branding → general agent
    business: 'business',
}

// Map tab values to display names for the chat context banner
const TAB_CHAT_LABELS: Record<string, string> = {
    details: 'Negocios',
    goals: 'Metas',
    finances: 'Finanzas',
    team: 'General',
    branding: 'General',
    business: 'Negocios',
}

export function ProjectDetailClient({
    domain,
    project,
    goals,
    transactions,
    companyCurrency,
    chatContactId,
    companyContext,
    teamMembers,
    teamInvites,
}: ProjectDetailClientProps) {
    const [activeTab, setActiveTab] = useState('details')

    const isBusiness = project.company_kind === 'business'
    const id = project.id

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center gap-4 mb-2">
                <Link href={`/${domain}/projects`} className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                    ← Volver a Proyectos
                </Link>
            </div>

            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
                    <p className="text-muted-foreground">{project.description || 'Sin descripción'}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100 uppercase font-bold px-3 py-1">
                        Proyecto Activo
                    </Badge>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details">Más detalles</TabsTrigger>
                    <TabsTrigger value="goals">Metas</TabsTrigger>
                    <TabsTrigger value="finances">Finanzas</TabsTrigger>
                    <TabsTrigger value="team">Equipo</TabsTrigger>
                    <TabsTrigger value="branding">
                        <Palette className="w-3.5 h-3.5 mr-1.5" />
                        Branding
                    </TabsTrigger>
                    {isBusiness && (
                        <TabsTrigger value="business">
                            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                            Negocio
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Más detalles — deep project info from companies table */}
                <TabsContent value="details" className="space-y-4">
                    <ProjectDetails project={project} />
                </TabsContent>

                {/* Metas */}
                <TabsContent value="goals">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="flex flex-row items-center justify-between px-0">
                            <div>
                                <CardTitle className="text-2xl">Metas del Proyecto</CardTitle>
                                <CardDescription>Define y sigue los objetivos clave para el éxito del proyecto.</CardDescription>
                            </div>
                            <GoalForm projectId={id} />
                        </CardHeader>
                        <CardContent className="px-0">
                            <GoalList projectId={id} goals={goals} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Finanzas */}
                <TabsContent value="finances">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold">Resumen Financiero</h3>
                                <p className="text-sm text-muted-foreground">Gestiona los ingresos y egresos de este proyecto.</p>
                            </div>
                            <Link href={`/${domain}/finance?projectId=${id}`}>
                                <Button>Registrar Transacción</Button>
                            </Link>
                        </div>
                        <ProjectFinance transactions={transactions} companyCurrency={companyCurrency} />
                    </div>
                </TabsContent>

                {/* Equipo */}
                <TabsContent value="team">
                    <ProjectTeam projectId={id} members={teamMembers} invites={teamInvites} />
                </TabsContent>

                {/* Branding */}
                <TabsContent value="branding">
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                            <h3 className="text-lg font-bold">Branding del Proyecto</h3>
                            <p className="text-sm text-muted-foreground">
                                Configura la identidad visual exclusiva de este proyecto: logos, colores, tipografía y más.
                            </p>
                        </div>
                        <CorporateBrandingForm
                            initialData={project}
                            canEdit={true}
                            saveEndpoint={`/api/projects/${id}/branding`}
                            companyIdOverride={id}
                            mode="project"
                        />
                    </div>
                </TabsContent>

                {/* Negocio — conditional */}
                {isBusiness && (
                    <TabsContent value="business">
                        <ProjectBusiness
                            projectId={id}
                            companyContext={companyContext}
                            domain={domain}
                        />
                    </TabsContent>
                )}
            </Tabs>

            {/* Floating AI Chat Agent — scoped to this project, routed by active tab */}
            {chatContactId && (
                <FloatingChat
                    contactId={chatContactId}
                    companyId={id}
                    projectName={project.name}
                    primaryColor={project.primary_color}
                    activeSection={activeTab}
                    agentId={TAB_AGENT_MAP[activeTab] || 'onboarding'}
                    chatLabel={TAB_CHAT_LABELS[activeTab] || 'General'}
                />
            )}
        </div>
    )
}
