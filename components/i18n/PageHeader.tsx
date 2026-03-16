'use client'

import { useTranslation } from '@/lib/i18n/useTranslation'
import { ReactNode } from 'react'

interface PageHeaderProps {
    titleKey: string
    subtitleKey?: string
    subtitleSuffix?: string
    icon?: ReactNode
    actions?: ReactNode
}

export function PageHeader({ titleKey, subtitleKey, subtitleSuffix, icon, actions }: PageHeaderProps) {
    const { t } = useTranslation()
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    {icon}
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t(titleKey)}</h1>
                </div>
                {subtitleKey && (
                    <p className="text-gray-500 mt-1">
                        {t(subtitleKey)}{subtitleSuffix || ''}
                    </p>
                )}
            </div>
            {actions}
        </div>
    )
}

/** Translates a single key and returns the string */
export function T({ k }: { k: string }) {
    const { t } = useTranslation()
    return <>{t(k)}</>
}
