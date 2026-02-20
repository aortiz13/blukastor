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
    if (compact) {
        return (
            <div className="space-y-4">
                {transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className={`p-2 rounded-full ${t.transaction_type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {t.transaction_type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Calendar size={10} /> {new Date(t.date).toLocaleDateString()}
                                </span>
                                <Badge variant="outline" className="text-[10px] uppercase">
                                    {t.category}
                                </Badge>
                            </div>
                        </div>
                        <div className={`text-sm font-bold ${t.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.amount, companyCurrency)}
                        </div>
                    </div>
                ))}
                {transactions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <DollarSign size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No hay transacciones registradas aún.</p>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle>Historial de Transacciones</CardTitle>
                <CardDescription>Todos los movimientos financieros vinculados a este proyecto.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(t.date).toLocaleDateString('es-CL', { timeZone: 'UTC' })}
                                    </TableCell>
                                    <TableCell className="font-medium">{t.description || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{t.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={t.transaction_type === 'income' ? 'default' : 'destructive'} className={t.transaction_type === 'income' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                            {t.transaction_type === 'income' ? 'Ingreso' : 'Egreso'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className={`text-right font-bold ${t.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.transaction_type === 'income' ? '+' : '-'}{formatCurrency(t.amount, companyCurrency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No se encontraron transacciones.
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
