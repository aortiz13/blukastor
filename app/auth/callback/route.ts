import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const next = searchParams.get("next") ?? "/administracion/dashboard";

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const origin = `${protocol}://${host}`;

    const redirectUrl = new URL(next, origin);

    if (code || token_hash) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // The `setAll` method was called from a Server Component.
                        }
                    },
                },
            }
        );

        let error = null;

        if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            error = exchangeError;
        } else if (token_hash && type) {
            // @ts-ignore
            const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash,
                type: type as any,
            });
            error = verifyError;
        }

        if (!error) {
            // IMPORTANT: In Next.js GET handlers, we MUST use a NextResponse object 
            // and set cookies on IT if we want them to persist through the redirect.
            // The cookies().set() call above might not be enough for some browser/Next.js versions.
            const response = NextResponse.redirect(redirectUrl.toString());

            // Forward cookies from cookieStore to response
            cookieStore.getAll().forEach((cookie) => {
                response.cookies.set(cookie.name, cookie.value);
            });

            return response;
        }

        console.error("[AuthCallback] Auth error:", error.message);
    }

    // Default fallback to login
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl.toString());
}
