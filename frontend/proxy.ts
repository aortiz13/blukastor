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

    console.log(`[Middleware] Host: ${request.headers.get('host')}, Path: ${path}`)

    // Ignore internal nextjs paths and static files
    if (path.startsWith('/_next') || path.includes('.') || path.startsWith('/api') || path.startsWith('/auth')) {
        return supabaseResponse
    }

    let hostname = request.headers.get('host') || ''
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'blukastor.vercel.app'

    console.log(`[Middleware] hostname: "${hostname}", rootDomain: "${rootDomain}"`)

    // Local Development Normalization
    if (process.env.NODE_ENV === 'development') {
        if (hostname.endsWith('.localhost:3000')) {
            hostname = hostname.replace('.localhost:3000', `.${rootDomain}`)
            console.log(`[Middleware] Normalized Development Subdomain: ${hostname}`)
        } else if (hostname === 'localhost:3000') {
            hostname = `${rootDomain}` // Default root
            console.log(`[Middleware] Normalized Development Root: ${hostname}`)
        }
    }

    // 3. Prevent Infinite Loops
    // If the path already starts with the target domain segment, it's an internal rewrite
    if (path.startsWith(`/${hostname}`)) {
        return supabaseResponse
    }

    let rewriteUrl: URL | null = null;

    // A. Root/Main Domain Logic (Landing Page vs Admin)
    const isRootDomain = hostname === rootDomain
    console.log(`[Middleware] isRootDomain: ${isRootDomain}, path: ${path}`)

    if (isRootDomain) {
        console.log(`[Middleware] Root Domain matched`)
        // If they visit /dashboard or /login on the root domain, let them pass to (admin) group
        if (path === '/dashboard' || path === '/login') {
            console.log(`[Middleware] Passing through to root route: ${path}`)
            return supabaseResponse
        }
        // Otherwise, everything else on root domain shows the Landing Page (app/page.tsx)
        console.log(`[Middleware] Showing landing page`)
        return supabaseResponse
    }

    // B. Admin/App Subdomain Logic (admin.root.com or app.root.com)
    if (hostname === `admin.${rootDomain}` || hostname === `app.${rootDomain}`) {
        console.log(`[Middleware] Admin/App subdomain matched: ${hostname}`)
        // Force /dashboard for the root of admin subdomain
        rewriteUrl = new URL(`${path === '/' ? '/dashboard' : path}`, request.url)
    }
    // C. Tenant Logic (anything else)
    else {
        console.log(`[Middleware] Tenant logic matched: ${hostname}`)
        // Rewrite to the (portal) group -> app/[domain]/...
        rewriteUrl = new URL(`/${hostname}${fullPath}`, request.url)
    }

    if (rewriteUrl) {
        console.log(`[Middleware] Rewriting to: ${rewriteUrl.pathname}`)
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
