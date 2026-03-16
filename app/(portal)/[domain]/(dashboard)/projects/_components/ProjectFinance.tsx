'use client'

import { formatCurrency } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface Transaction {
    id: string
    date: string
    description: string
    category: string
    transaction_type: 'income' | 'expense'
    amount: number
    original_currency?: string
    original_amount?: number
}

interface ProjectFinanceProps {
    transactions: Transaction[]
    companyCurrency: string
    compact?: boolean
}

export function ProjectFinance({ transactions, companyCurrency, compact = false }: ProjectFinanceProps) {
    const { t } = useTranslation()

    if (compact) {
        return (
            <div className="space-y-4">
                {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className={`p-2 rounded-full ${tx.transaction_type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {tx.transaction_type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Calendar size={10} /> {new Date(tx.date).toLocaleDateString()}
                                </span>
                                <Badge variant="outline" className="text-[10px] uppercase">
                                    {tx.category}
                                </Badge>
                            </div>
                        </div>
                        <div className={`text-sm font-bold ${tx.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, companyCurrency)}
                        </div>
                    </div>
                ))}
                {transactions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <DollarSign size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">{t('projectFinance.noTransactionsYet')}</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle>{t('projectFinance.history')}</CardTitle>
                <CardDescription>{t('projectFinance.historyDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('projectFinance.date')}</TableHead>
                                <TableHead>{t('projectFinance.description')}</TableHead>
                                <TableHead>{t('projectFinance.category')}</TableHead>
                                <TableHead>{t('projectFinance.type')}</TableHead>
                                <TableHead className="text-right">{t('projectFinance.amount')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(tx.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-medium">{tx.description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{tx.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={tx.transaction_type === 'income' ? 'default' : 'destructive'} className={tx.transaction_type === 'income' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                            {tx.transaction_type === 'income' ? t('projectFinance.income') : t('projectFinance.expense')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={`text-right font-bold ${tx.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, companyCurrency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        {t('projectFinance.noTransactions')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
