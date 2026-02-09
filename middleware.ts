import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
        // We need to check the role. Since we can't easily query the DB here without potential cost/latency,
        // we might defer this to the page/layout OR do a quick check if we have the role in metadata.
        // For now, let's allow access and let specific pages/layout handle the fine-grained UI hiding,
        // BUT strict security should be here.
        // However, reading the DB in middleware is possible with createServerClient.

        // Let's implement a quick check for sensitive routes like /administracion/settings
        if (request.nextUrl.pathname.startsWith("/administracion/settings")) {
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .single();

            if (roleData?.role !== 'admin') {
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
