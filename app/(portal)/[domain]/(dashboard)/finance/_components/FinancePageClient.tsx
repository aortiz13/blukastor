'use client'

import { useTranslation } from '@/lib/i18n/useTranslation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { ReactNode } from 'react'

interface FinanceHeaderProps {
    companyCurrency: string
    stats: { revenue: number; expenses: number; netIncome: number }
    projectId?: string
    toolbar: ReactNode
    children: ReactNode
}

export function FinancePageClient({ companyCurrency, stats, projectId, toolbar, children }: FinanceHeaderProps) {
    const { t } = useTranslation()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('finance.title')}</h2>
                <div className="flex items-center space-x-2">
                    {toolbar}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('finance.totalIncome')} ({companyCurrency})</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(stats.revenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {projectId ? t('finance.filteredByProject') : t('finance.allProjects')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('finance.expenses')} ({companyCurrency})</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(stats.expenses)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {projectId ? t('finance.filteredByProject') : t('finance.allProjects')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('finance.netIncome')} ({companyCurrency})</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: companyCurrency }).format(stats.netIncome)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {projectId ? t('finance.filteredByProject') : t('finance.allProjects')}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts + Table passed as children */}
            {children}

            {/* Recent Transactions label */}
        </div>
    )
}

export function TransactionsCardHeader() {
    const { t } = useTranslation()
    return <CardTitle>{t('finance.recentTransactions')}</CardTitle>
}
