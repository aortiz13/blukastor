'use client'

import { ReactNode } from 'react'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Locale } from '@/lib/i18n/translations'

export function DashboardLayoutClient({
    children,
    initialLocale,
}: {
    children: ReactNode
    initialLocale: string
}) {
    return (
        <LanguageProvider initialLocale={(initialLocale as Locale) || 'es'}>
            {children}
        </LanguageProvider>
    )
}
