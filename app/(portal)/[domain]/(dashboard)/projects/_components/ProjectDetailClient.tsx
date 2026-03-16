'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, Clock, Briefcase, Palette, Settings } from 'lucide-react'
import Link from 'next/link'
import { GoalList } from './GoalList'
import { GoalForm } from './GoalForm'
import { ProjectTeam } from './ProjectTeam'
import { ProjectFinance } from './ProjectFinance'
import { ProjectDetails } from './ProjectDetails'
import { ProjectBusiness } from './ProjectBusiness'
import { FloatingChat } from '@/components/chat/floating-chat'
import { CorporateBrandingForm } from '@/app/corporate/branding/corporate-branding-form'
import { ProjectActions } from './ProjectActions'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface ProjectDetailClientProps {
    domain: string
    project: any
    goals: any[]
    transactions: any[]
    companyCurrency: string
    chatContactId: string | null
    chatCompanyId: string
    companyContext: any | null
    teamMembers: any[]
    teamInvites: any[]
}

export function ProjectDetailClient({
    domain,
    project,
    goals,
    transactions,
    companyCurrency,
    chatContactId,
    chatCompanyId,
    companyContext,
    teamMembers,
    teamInvites,
}: ProjectDetailClientProps) {
    const [activeTab, setActiveTab] = useState('details')
    const { t } = useTranslation()

    // Map tab values to agent types
    const TAB_AGENT_MAP: Record<string, string> = {
        details: 'business',
        goals: 'goals',
        finances: 'finance',
        team: 'onboarding',
        branding: 'onboarding',
        business: 'business',
    }

    // Map tab values to display names for the chat context banner
    const TAB_CHAT_LABELS: Record<string, string> = {
        details: t('project.chatBusiness'),
        goals: t('project.chatGoals'),
        finances: t('project.chatFinance'),
        team: t('project.chatGeneral'),
        branding: t('project.chatGeneral'),
        business: t('project.chatBusiness'),
    }

    const isBusiness = project.company_kind === 'business'
    const id = project.id

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center gap-4 mb-2">
                <Link href="/projects" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                    {t('project.backToProjects')}
                </Link>
            </div>

            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{project.name}</h2>
                    <p className="text-muted-foreground">{project.description || t('project.noDescription')}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge
                        variant="outline"
                        className={`uppercase font-bold px-3 py-1 ${
                            project.is_active
                                ? 'text-blue-600 bg-blue-50 border-blue-100'
                                : 'text-amber-600 bg-amber-50 border-amber-100'
                        }`}
                    >
                        {project.is_active ? t('project.active') : t('project.archived')}
                    </Badge>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details">{t('project.tabDetails')}</TabsTrigger>
                    <TabsTrigger value="goals">{t('project.tabGoals')}</TabsTrigger>
                    <TabsTrigger value="finances">{t('project.tabFinances')}</TabsTrigger>
                    <TabsTrigger value="team">{t('project.tabTeam')}</TabsTrigger>
                    <TabsTrigger value="branding">
                        <Palette className="w-3.5 h-3.5 mr-1.5" />
                        {t('project.tabBranding')}
                    </TabsTrigger>
                    {isBusiness && (
                        <TabsTrigger value="business">
                            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                            {t('project.tabBusiness')}
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="settings">
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        {t('project.tabSettings')}
                    </TabsTrigger>
                </TabsList>

                {/* Details */}
                <TabsContent value="details" className="space-y-4">
                    <ProjectDetails project={project} />
                </TabsContent>

                {/* Goals */}
                <TabsContent value="goals">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardHeader className="flex flex-row items-center justify-between px-0">
                            <div>
                                <CardTitle className="text-2xl">{t('project.goalsTitle')}</CardTitle>
                                <CardDescription>{t('project.goalsDesc')}</CardDescription>
                            </div>
                            <GoalForm projectId={id} />
                        </CardHeader>
                        <CardContent className="px-0">
                            <GoalList projectId={id} goals={goals} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Finances */}
                <TabsContent value="finances">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold">{t('project.financeSummary')}</h3>
                                <p className="text-sm text-muted-foreground">{t('project.financeDesc')}</p>
                            </div>
                            <Link href={`/finance?projectId=${id}`}>
                                <Button>{t('project.registerTransaction')}</Button>
                            </Link>
                        </div>
                        <ProjectFinance transactions={transactions} companyCurrency={companyCurrency} />
                    </div>
                </TabsContent>

                {/* Team */}
                <TabsContent value="team">
                    <ProjectTeam projectId={id} members={teamMembers} invites={teamInvites} />
                </TabsContent>

                {/* Branding */}
                <TabsContent value="branding">
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                            <h3 className="text-lg font-bold">{t('project.brandingTitle')}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('project.brandingDesc')}
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

                {/* Business — conditional */}
                {isBusiness && (
                    <TabsContent value="business">
                        <ProjectBusiness
                            projectId={id}
                            companyContext={companyContext}
                            domain={domain}
                        />
                    </TabsContent>
                )}

                {/* Settings */}
                <TabsContent value="settings">
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                            <h3 className="text-lg font-bold">{t('project.settingsTitle')}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('project.settingsDesc')}
                            </p>
                        </div>
                        <ProjectActions
                            projectId={id}
                            projectName={project.name}
                            isActive={project.is_active}
                        />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Floating AI Chat Agent — scoped to this project, routed by active tab */}
            {chatContactId && (
                <FloatingChat
                    contactId={chatContactId}
                    companyId={chatCompanyId}
                    projectName={project.name}
                    primaryColor={project.primary_color}
                    activeSection={activeTab}
                    agentId={TAB_AGENT_MAP[activeTab] || 'onboarding'}
                    chatLabel={TAB_CHAT_LABELS[activeTab] || t('project.chatGeneral')}
                    projectId={id}
                />
            )}
        </div>
    )
}
