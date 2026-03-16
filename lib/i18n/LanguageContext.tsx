'use client'

import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { Locale, getTranslation } from './translations'

interface LanguageContextType {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: (key: string) => string
}

export const LanguageContext = createContext<LanguageContextType>({
    locale: 'es',
    setLocale: () => {},
    t: (key: string) => key,
})

interface LanguageProviderProps {
    children: ReactNode
    initialLocale?: Locale
}

export function LanguageProvider({ children, initialLocale = 'es' }: LanguageProviderProps) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        // Try to read from localStorage on client
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('blukastor_locale') as Locale | null
            if (stored === 'es' || stored === 'en') return stored
        }
        return initialLocale
    })

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale)
        if (typeof window !== 'undefined') {
            localStorage.setItem('blukastor_locale', newLocale)
        }
    }, [])

    // Sync when initialLocale changes (e.g., from server)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('blukastor_locale') as Locale | null
            // If nothing stored yet, use initialLocale
            if (!stored) {
                setLocaleState(initialLocale)
            }
        }
    }, [initialLocale])

    const t = useCallback((key: string) => {
        return getTranslation(locale, key)
    }, [locale])

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    )
}
