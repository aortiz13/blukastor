'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { CURRENCIES } from '@/lib/utils/currency'
import { updateCompanySettings } from '@/lib/actions/settings'

interface GeneralSettingsProps {
    company: {
        id: string
        name: string
        currency: string
    }
}

export function GeneralSettings({ company }: GeneralSettingsProps) {
    const [loading, setLoading] = useState(false)
    const [currency, setCurrency] = useState(company.currency || 'USD')

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await updateCompanySettings(company.id, { currency })
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Configuración actualizada exitosamente')
            }
        } catch (error) {
            toast.error('Error al actualizar la configuración')
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuración General</CardTitle>
                    <CardDescription>
                        Administra las preferencias y valores predeterminados de tu empresa.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="currency">Moneda Base</Label>
                        <Select value={currency} onValueChange={setCurrency} disabled={loading}>
                            <SelectTrigger id="currency" className="w-[280px]">
                                <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCIES.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        <span className="font-medium">{c.code}</span>
                                        <span className="text-muted-foreground ml-2">- {c.name} ({c.symbol})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Esta es la moneda utilizada para todos tus reportes financieros y paneles.
                            Las transacciones en otras monedas se convertirán automáticamente a esta moneda base.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={loading || currency === company.currency}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
