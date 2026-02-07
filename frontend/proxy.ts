import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export default async function proxy(request: NextRequest) {
    // 1. Update Supabase Auth Session
    const supabaseResponse = await updateSession(request)

    // 2. Path & Hostname Prep
    const url = request.nextUrl
    const path = url.pathname
    const searchParams = url.searchParams.toString()
    const fullPath = `${path}${searchParams.length > 0 ? `?${searchParams}` : ''}`

    // Ignore internal nextjs paths and static files
    if (path.startsWith('/_next') || path.includes('.') || path.startsWith('/api') || path.startsWith('/auth')) {
        return supabaseResponse
    }

    let hostname = request.headers.get('host') || ''
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'blukastor.vercel.app'

    // Local Development Normalization
    if (process.env.NODE_ENV === 'development') {
        if (hostname.endsWith('.localhost:3000')) {
            hostname = hostname.replace('.localhost:3000', `.${rootDomain}`)
        } else if (hostname === 'localhost:3000') {
            hostname = `${rootDomain}`
        }
    }

    // 3. Prevent Infinite Loops
    if (path.startsWith(`/${hostname}`)) {
        return supabaseResponse
    }

    let rewriteUrl: URL | null = null;

    // A. Root/Main Domain Logic (Landing Page vs Admin)
    if (hostname === rootDomain) {
        // If they visit /dashboard or /login on the root domain, let them pass through
        if (path === '/dashboard' || path === '/login') {
            return supabaseResponse
        }
        return supabaseResponse
    }

    // B. Admin/App Subdomain Logic (admin.root.com or app.root.com)
    if (hostname === `admin.${rootDomain}` || hostname === `app.${rootDomain}`) {
        rewriteUrl = new URL(`${path === '/' ? '/dashboard' : path}`, request.url)
    }
    // C. Tenant Logic (anything else)
    else {
        // Rewrite to the (portal) group -> app/[domain]/...
        rewriteUrl = new URL(`/${hostname}${fullPath}`, request.url)
    }

    if (rewriteUrl) {
        const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
            request: {
                headers: request.headers,
            }
        })
        supabaseResponse.headers.forEach((value, key) => {
            rewriteResponse.headers.set(key, value)
        })
        return rewriteResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
