'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import { useTranslation } from "@/lib/i18n/useTranslation"

interface CashFlowChartProps {
    data: { name: string, income: number, expense: number }[]
    currency: string
}

export function CashFlowChart({ data, currency }: CashFlowChartProps) {
    const { t } = useTranslation()
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>{t('chart.cashFlow')}</CardTitle>
                <CardDescription>{t('chart.cashFlowDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip
                            formatter={(value: any) => formatCurrency(Number(value), currency)}
                            labelFormatter={(label) => `${t('chart.month')}: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="income" name={t('chart.income')} fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" name={t('chart.expense')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
