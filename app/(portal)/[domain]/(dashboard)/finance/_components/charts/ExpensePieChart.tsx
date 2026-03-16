'use client'

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils/currency"
import { useTranslation } from "@/lib/i18n/useTranslation"

interface ExpensePieChartProps {
    data: { name: string, value: number }[]
    currency: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#64748b']

export function ExpensePieChart({ data, currency }: ExpensePieChartProps) {
    const { t } = useTranslation()
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>{t('chart.expenseByCategory')}</CardTitle>
                <CardDescription>{t('chart.expenseByCategoryDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
