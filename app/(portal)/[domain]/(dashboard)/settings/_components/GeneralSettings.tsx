'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Globe } from 'lucide-react'
import { CURRENCIES } from '@/lib/utils/currency'
import { updateCompanySettings } from '@/lib/actions/settings'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { SUPPORTED_LOCALES, Locale } from '@/lib/i18n/translations'

interface GeneralSettingsProps {
    company: {
        id: string
        name: string
        currency: string
        locale?: string
    }
}

export function GeneralSettings({ company }: GeneralSettingsProps) {
    const { t, locale: currentLocale, setLocale } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [currency, setCurrency] = useState(company.currency || 'USD')
    const [language, setLanguage] = useState<Locale>((company.locale as Locale) || 'es')

    const hasChanges = currency !== company.currency || language !== (company.locale || 'es')

    const handleSave = async () => {
        setLoading(true)
        try {
            const result = await updateCompanySettings(company.id, {
                currency,
                locale: language,
            })
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(t('settings.saved'))
                // Update app-wide locale when saving
                setLocale(language)
            }
        } catch (error) {
            toast.error(t('settings.error'))
        }
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            {/* Currency Card */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.general.title')}</CardTitle>
                    <CardDescription>
                        {t('settings.general.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="currency">{t('settings.currency.label')}</Label>
                        <Select value={currency} onValueChange={setCurrency} disabled={loading}>
                            <SelectTrigger id="currency" className="w-[280px]">
                                <SelectValue placeholder={t('settings.currency.placeholder')} />
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
                            {t('settings.currency.description')}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Language Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div>
                            <CardTitle>{t('settings.language.title')}</CardTitle>
                            <CardDescription>
                                {t('settings.language.description')}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="language">{t('settings.language.label')}</Label>
                        <Select value={language} onValueChange={(v) => setLanguage(v as Locale)} disabled={loading}>
                            <SelectTrigger id="language" className="w-[280px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_LOCALES.map((loc) => (
                                    <SelectItem key={loc.code} value={loc.code}>
                                        <span className="mr-2">{loc.flag}</span>
                                        <span className="font-medium">{loc.label}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading || !hasChanges}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('settings.save')}
                </Button>
            </div>
        </div>
    )
}
