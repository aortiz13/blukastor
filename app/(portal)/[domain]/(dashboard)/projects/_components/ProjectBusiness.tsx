'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Briefcase, TrendingUp, Target, Users,
    DollarSign, FileText, Sparkles, MessageCircle,
    ShoppingBag, BarChart3, Megaphone
} from 'lucide-react'

interface ProjectBusinessProps {
    projectId: string
    companyContext: any | null
    domain: string
}

function BusinessSection({ title, subtitle, icon, children, empty }: {
    title: string
    subtitle?: string
    icon: React.ReactNode
    children: React.ReactNode
    empty?: boolean
}) {
    return (
        <Card className={`border ${empty ? 'border-dashed border-gray-200' : 'border-gray-100'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-gray-50">{icon}</div>
                        <div>
                            <CardTitle className="text-base font-semibold">{title}</CardTitle>
                            {subtitle && <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>}
                        </div>
                    </div>
                    {!empty && (
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-100 text-[10px]">
                            Completado
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function JsonDataDisplay({ data, excludeKeys = [] }: { data: Record<string, any>; excludeKeys?: string[] }) {
    const entries = Object.entries(data).filter(([k]) => !excludeKeys.includes(k))

    if (entries.length === 0) return <p className="text-sm text-gray-300 italic">Sin datos</p>

    return (
        <div className="space-y-3">
            {entries.map(([key, value]) => (
                <div key={key} className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                    </p>
                    {Array.isArray(value) ? (
                        <ul className="space-y-1">
                            {value.map((item, i) => (
                                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="text-gray-300 mt-0.5">•</span>
                                    <span>{typeof item === 'string' ? item : JSON.stringify(item)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : typeof value === 'object' && value !== null ? (
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                            <JsonDataDisplay data={value} />
                        </div>
                    ) : (
                        <p className="text-sm text-gray-800">{String(value)}</p>
                    )}
                </div>
            ))}
        </div>
    )
}

function EmptyPlanState({ title, chatHint }: { title: string; chatHint: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="w-8 h-8 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 mb-2">
                No hay datos de <strong>{title}</strong> aún.
            </p>
            <p className="text-xs text-gray-300">
                {chatHint}
            </p>
        </div>
    )
}

export function ProjectBusiness({ projectId, companyContext, domain }: ProjectBusinessProps) {
    const ctx = companyContext || {}

    const hasBusinessPlan = ctx.business_plan && Object.keys(ctx.business_plan).length > 0
    const hasMarketingPlan = ctx.marketing_plan && Object.keys(ctx.marketing_plan).length > 0
    const hasSalesPlan = ctx.sales_plan && Object.keys(ctx.sales_plan).length > 0
    const hasFinancialPlan = ctx.financial_plan && Object.keys(ctx.financial_plan).length > 0

    const isEmpty = !hasBusinessPlan && !hasMarketingPlan && !hasSalesPlan && !hasFinancialPlan && !ctx.industry

    return (
        <div className="space-y-6">
            {/* Summary header */}
            <div className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-gray-600" />
                            Información de Negocio
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Datos generados y gestionados por el Agente de Negocios a través del chat.
                        </p>
                    </div>
                    {ctx.industry && (
                        <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100">
                            {ctx.industry}
                        </Badge>
                    )}
                </div>
                {ctx.primary_region && (
                    <p className="text-xs text-gray-500 mt-2">
                        Región principal: <strong>{ctx.primary_region}</strong>
                    </p>
                )}
            </div>

            {isEmpty && (
                <Card className="border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-white">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                            <Briefcase className="w-8 h-8 text-purple-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Define tu plan de negocio</h3>
                        <p className="text-sm text-gray-500 max-w-md mb-4">
                            Chatea con el asistente de negocios para definir tu plan de negocio,
                            estrategia de marketing, plan de ventas y plan financiero.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-4 py-2 rounded-full font-medium">
                            <MessageCircle className="w-3.5 h-3.5" />
                            Usa el chat para comenzar tu plan de negocio
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Plan */}
                <BusinessSection
                    title="Plan de Negocio"
                    subtitle="Modelo, propuesta de valor y estrategia"
                    icon={<FileText className="w-4 h-4 text-blue-500" />}
                    empty={!hasBusinessPlan}
                >
                    {hasBusinessPlan ? (
                        <JsonDataDisplay data={ctx.business_plan} />
                    ) : (
                        <EmptyPlanState
                            title="plan de negocio"
                            chatHint="Conversa con el agente para definir tu modelo de negocio."
                        />
                    )}
                </BusinessSection>

                {/* Marketing Plan */}
                <BusinessSection
                    title="Plan de Marketing"
                    subtitle="Canales, audiencia y estrategia de crecimiento"
                    icon={<Megaphone className="w-4 h-4 text-orange-500" />}
                    empty={!hasMarketingPlan}
                >
                    {hasMarketingPlan ? (
                        <JsonDataDisplay data={ctx.marketing_plan} />
                    ) : (
                        <EmptyPlanState
                            title="plan de marketing"
                            chatHint="El agente te ayudará a definir tu estrategia de marketing."
                        />
                    )}
                </BusinessSection>

                {/* Sales Plan */}
                <BusinessSection
                    title="Plan de Ventas"
                    subtitle="Productos, precios y estrategia comercial"
                    icon={<ShoppingBag className="w-4 h-4 text-green-500" />}
                    empty={!hasSalesPlan}
                >
                    {hasSalesPlan ? (
                        <JsonDataDisplay data={ctx.sales_plan} />
                    ) : (
                        <EmptyPlanState
                            title="plan de ventas"
                            chatHint="Define tus productos y estrategia de ventas a través del chat."
                        />
                    )}
                </BusinessSection>

                {/* Financial Plan */}
                <BusinessSection
                    title="Plan Financiero"
                    subtitle="Presupuesto, inversión y proyecciones"
                    icon={<BarChart3 className="w-4 h-4 text-purple-500" />}
                    empty={!hasFinancialPlan}
                >
                    {hasFinancialPlan ? (
                        <JsonDataDisplay data={ctx.financial_plan} />
                    ) : (
                        <EmptyPlanState
                            title="plan financiero"
                            chatHint="El agente te guiará para crear tu plan financiero."
                        />
                    )}
                </BusinessSection>
            </div>
        </div>
    )
}
