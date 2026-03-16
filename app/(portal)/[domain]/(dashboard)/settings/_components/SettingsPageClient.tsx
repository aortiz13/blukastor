'use client'

import { useTranslation } from '@/lib/i18n/useTranslation'
import { ReactNode } from 'react'

export function SettingsPageClient({ companyName, children }: { companyName: string; children: ReactNode }) {
    const { t } = useTranslation()

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{t('settings.title')}</h1>
                <p className="text-muted-foreground mt-2">
                    {t('settings.subtitle')} {companyName}
                </p>
            </div>
            {children}
        </div>
    )
}
