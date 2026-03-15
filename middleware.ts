import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export default async function middleware(request: NextRequest) {
    // 1. Update Supabase Auth Session
    const supabaseResponse = await updateSession(request)

    // 2. Path & Hostname Prep
    const url = request.nextUrl
    const path = url.pathname
    const searchParams = url.searchParams.toString()
    const fullPath = `${path}${searchParams.length > 0 ? `?${searchParams}` : ''}`

    // Ignore internal nextjs paths and static files
    // Refined to catch common file extensions instead of any dot
    const isStaticFile = /\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|mjs|txt|xml|json)$/.test(path)
    if (path.startsWith('/_next') || isStaticFile || path.startsWith('/api') || path.startsWith('/auth') || path.startsWith('/admin') || path.startsWith('/portal-invite')) {
        return supabaseResponse
    }

    // For corporate paths, inject x-pathname into request headers so server components can read it
    if (path.startsWith('/corporate')) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-pathname', path)
        const corporateResponse = NextResponse.next({
            request: { headers: requestHeaders },
        })
        // Preserve Supabase auth cookies
        supabaseResponse.headers.forEach((value, key) => {
            corporateResponse.headers.set(key, value)
        })
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            corporateResponse.cookies.set(cookie.name, cookie.value)
        })
        return corporateResponse
    }

    let hostname = request.headers.get('host') || ''
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

    // Local Development Normalization
    if (process.env.NODE_ENV === 'development') {
        // If it's blukastor.localhost:3000 -> hostname becomes blukastor
        if (hostname.endsWith('.localhost:3000')) {
            hostname = hostname.replace('.localhost:3000', '')
        } else if (hostname === 'localhost:3000' || hostname === '127.0.0.1:3000') {
            hostname = rootDomain.split(':')[0] // Use first part of rootDomain
        }
    } else {
        // Production logic
        // We do NOT want to strip the root domain from `hostname` quite yet 
        // because the Tenant Logic (app/[domain]) expects the full custom domain (like `admin.autoflowai.io`) 
        // OR the subdomain. Our database uses the full domain. 
        // The Vercel platforms starter usually just leaves `hostname` intact for domains 
        // and only strips for subdomains IF the database stores subdomains. 
        // Since Blukastor DB stores `domain` as `empresa.autoflowai.io` we should leave hostname intact.
    }

    // 3. Handle RSC prefetch requests that already include the [domain] segment in the path.
    // Client-side Next.js navigation sends fetches to hrefs like /app.asktitto.com/goals,
    // which already contain the domain prefix. We detect this and rewrite properly to the
    // internal [domain] route, stripping the double-domain and re-applying the rewrite.
    if (path.startsWith(`/${hostname}/`) || path === `/${hostname}`) {
        // The path already has the domain prefix from client-side href.
        // Just pass it through as-is — it already maps to /[domain]/... route structure.
        const rewriteResponse = NextResponse.rewrite(
            new URL(`${path}${searchParams.length > 0 ? `?${searchParams}` : ''}`, request.url),
            { request: { headers: request.headers } }
        )
        supabaseResponse.headers.forEach((value, key) => {
            rewriteResponse.headers.set(key, value)
        })
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            rewriteResponse.cookies.set(cookie.name, cookie.value)
        })
        return rewriteResponse
    }

    let rewriteUrl: URL | null = null;

    // A. Root/Main Domain Logic (Landing Page vs Admin)
    const normalizedRoot = rootDomain.split(':')[0]
    if (hostname === rootDomain || hostname === normalizedRoot) {
        // If they visit /dashboard or /login on the root domain, let them pass through
        if (path === '/dashboard' || path === '/login') {
            return supabaseResponse
        }
        return supabaseResponse
    }

    // B. Admin/App Subdomain Logic (admin.root.com or app.root.com)
    if (hostname === `admin.${rootDomain}` || hostname === `app.${rootDomain}` || hostname === `admin.${normalizedRoot}` || hostname === `app.${normalizedRoot}`) {
        if (path === '/') {
            rewriteUrl = new URL('/dashboard', request.url)
        } else if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/login') || path.startsWith('/reset-password')) {
            // Admin-specific paths: pass through directly
            return supabaseResponse
        } else {
            // Portal paths: rewrite to include hostname as [domain] segment
            rewriteUrl = new URL(`/${hostname}${fullPath}`, request.url)
        }
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
        supabaseResponse.cookies.getAll().forEach((cookie) => {
            rewriteResponse.cookies.set(cookie.name, cookie.value)
        })
        return rewriteResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|mjs|json)$).*)',
    ],
}
