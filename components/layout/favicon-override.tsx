'use client'

import { useEffect } from 'react'

/**
 * Dynamically overrides the browser favicon with a company-specific icon.
 * This is needed because Next.js static `app/favicon.ico` takes precedence 
 * over metadata-generated icons. This client component manually replaces 
 * the favicon link tags at runtime.
 */
export function FaviconOverride({ url }: { url: string }) {
    useEffect(() => {
        if (!url) return

        // Replace existing favicon links
        const linkTypes = ['icon', 'shortcut icon', 'apple-touch-icon']

        linkTypes.forEach(rel => {
            let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
            if (link) {
                link.href = url
            } else {
                link = document.createElement('link')
                link.rel = rel
                link.href = url
                document.head.appendChild(link)
            }
        })

        // Also handle rel="icon" with sizes (Next.js default)
        const allIcons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
        allIcons.forEach(link => {
            link.href = url
        })
    }, [url])

    return null
}
