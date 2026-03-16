'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import { useTranslation } from "@/lib/i18n/useTranslation"

interface ProjectIncomeChartProps {
    data: { name: string, value: number }[]
    currency: string
}

export function ProjectIncomeChart({ data, currency }: ProjectIncomeChartProps) {
    const { t } = useTranslation()
    return (
        <Card className="col-span-3 lg:col-span-3">
            <CardHeader>
                <CardTitle>{t('chart.incomeBySource')}</CardTitle>
                <CardDescription>{t('chart.incomeBySourceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={100}
                        />
                        <Tooltip
                            formatter={(value: any) => formatCurrency(Number(value), currency)}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
