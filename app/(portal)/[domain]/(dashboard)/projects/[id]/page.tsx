import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectGoals } from '@/lib/actions/projects'
import { getFinancialStats, getTransactions } from '@/lib/actions/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Briefcase, Target, Users, DollarSign, TrendingUp, TrendingDown, Clock, AlertCircle, Shield } from 'lucide-react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GoalList } from '../_components/GoalList'
import { GoalForm } from '../_components/GoalForm'
import { ProjectTeam } from '../_components/ProjectTeam'
import { ProjectFinance } from '../_components/ProjectFinance'

export default async function ProjectDetailPage({
    params,
}: {
    params: Promise<{ domain: string, id: string }>
}) {
    const { domain, id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/${domain}/login`)

    const project = await getProject(id)
    if (!project) return <div>Proyecto no encontrado</div>

    const companyId = project.client_company_id || project.id
    const companyCurrency = project.currency || 'USD'

    const [goals, finance, transactions] = await Promise.all([
        getProjectGoals(id),
        getFinancialStats(companyId, id),
        getTransactions(companyId, { projectId: id, limit: 5 })
    ])

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

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">General</TabsTrigger>
                    <TabsTrigger value="goals">Metas</TabsTrigger>
                    <TabsTrigger value="finances">Finanzas</TabsTrigger>
                    <TabsTrigger value="team">Equipo</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Metas Activas</CardTitle>
                                <Target className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{goals.length}</div>
                                <p className="text-xs text-muted-foreground">Objetivos trazados</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(finance.revenue)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(finance.expenses)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Saldo Neto</CardTitle>
                                <Shield className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${finance.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(finance.netIncome)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>Metas Próximas</CardTitle>
                                <CardDescription>Metas con fechas de entrega cercanas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {goals.slice(0, 5).map((goal: any) => (
                                        <div key={goal.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors">
                                            <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                                                <Target size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{goal.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="outline" className={`text-[10px] uppercase ${goal.priority === 'high' || goal.priority === 'critical' ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'
                                                        }`}>
                                                        {goal.priority}
                                                    </Badge>
                                                    {goal.deadline && (
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Clock size={10} /> {new Date(goal.deadline).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">
                                                {goal.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {goals.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Target size={32} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-sm">No hay metas registradas aún.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>Transacciones Recientes</CardTitle>
                                <CardDescription>Últimos movimientos financieros.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ProjectFinance transactions={transactions} companyCurrency={companyCurrency} compact={true} />
                                <div className="mt-4">
                                    <Link href={`/${domain}/finance?projectId=${id}`}>
                                        <Button variant="outline" size="sm" className="w-full">
                                            Ver Todo en Finanzas
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

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

                <TabsContent value="team">
                    <ProjectTeam projectId={id} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
