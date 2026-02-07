import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    // 1. Update Supabase Auth Session
    // This returns a response with valid Set-Cookie headers for session refresh
    const supabaseResponse = await updateSession(request)

    // 2. White Label Routing Logic
    const url = request.nextUrl
    let hostname = request.headers.get('host')!.replace('.localhost:3000', `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`)

    // Handle local development where host might not include the root domain correctly
    if (process.env.NODE_ENV === 'development' && hostname === 'localhost:3000') {
        hostname = 'app.localhost:3000'
    }

    const searchParams = request.nextUrl.searchParams.toString()
    const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''
        }`

    let rewriteUrl: URL | null = null;

    // Rewrite for Admin/App Subdomain
    if (hostname === `admin.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` || hostname === `app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
        rewriteUrl = new URL(`${path === '/' ? '/dashboard' : path}`, request.url)
    }
    // Rewrite for White Label Domains (Custom Domains or Subdomains)
    else if (hostname !== process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
        rewriteUrl = new URL(`/${hostname}${path}`, request.url)
    }

    // If a rewrite is needed, create the rewrite response but Preserve Supabase Cookies
    if (rewriteUrl) {
        const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
            request: {
                headers: request.headers,
            }
        })

        // Copy Set-Cookie headers from supabaseResponse (which might have refreshed session)
        supabaseResponse.headers.forEach((value, key) => {
            rewriteResponse.headers.set(key, value)
        })

        return rewriteResponse
    }

    // Default: Return the Supabase response (which is just next() with cookies)
    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
