'use client'

import { useTranslation } from '@/lib/i18n/useTranslation'
import { Palette } from 'lucide-react'

export function BrandingHeader() {
    const { t } = useTranslation()
    return (
        <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-pink-100 rounded-2xl">
                    <Palette className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        {t('branding.title')}
                    </h1>
                    <p className="text-gray-500 mt-0.5">
                        {t('branding.subtitle')}
                    </p>
                </div>
            </div>
        </div>
    )
}
