import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Middleware Supabase Init Failed: Missing URL or Key");
        console.error("URL Found:", !!supabaseUrl);
        console.error("Key Found:", !!supabaseKey);
        // We might want to allow the request to proceed if it's not a protected route,
        // or just crash/error out. For now, let's let createServerClient throw its own error
        // or return a dummy client that will fail on use, but best to throw here if critical.
        // However, existing behavior was to crash inside createServerClient.
        // Let's proceed but likely it will fail.
    }

    const supabase = createServerClient(
        supabaseUrl!,
        supabaseKey!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Protected Routes Logic
    // If accessing /administracion/* and not authenticated, redirect to /login
    if (request.nextUrl.pathname.startsWith("/administracion") && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Auth Routes Logic
    // If accessing /login or /signup and ALREADY authenticated, redirect to /administracion/dashboard
    // Also block /signup for non-admins (public signup disabled)
    if (request.nextUrl.pathname.startsWith("/signup")) {
        // Check if there is an invite code or similar if we wanted that, but user asked to DISABLE it.
        // "no se permita registrar". So we redirect /signup to /login.
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (request.nextUrl.pathname.startsWith("/login") && user) {
        const url = request.nextUrl.clone();
        url.pathname = "/administracion/dashboard"; // Default landing. Middleware/Page logic can redirect Basic users later if needed.
        return NextResponse.redirect(url);
    }

    // Role-based access control for Basic users
    if (request.nextUrl.pathname.startsWith("/administracion") && user) {
        console.log("[Middleware] Verifying role for user:", user.email);

        // Quick check for sensitive routes like /administracion/settings
        if (request.nextUrl.pathname.startsWith("/administracion/settings")) {
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .single();

            console.log("[Middleware] Role found for settings access:", roleData?.role);

            if (roleData?.role !== 'admin') {
                console.log("[Middleware] Redirecting non-admin away from settings");
                // Redirect Basic users away from settings
                const url = request.nextUrl.clone();
                url.pathname = "/administracion/leads";
                return NextResponse.redirect(url);
            }
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
