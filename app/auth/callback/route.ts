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
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("next", next);

    // Create the response object FIRST so we can set cookies on it
    const response = NextResponse.redirect(redirectUrl.toString());

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
                            cookiesToSet.forEach(({ name, value, options }) => {
                                // Set on cookieStore for server-side persistence in current request
                                cookieStore.set(name, value, options);
                                // Set on response for browser persistence
                                response.cookies.set(name, value, options);
                            });
                        } catch {
                            // The `setAll` method was called from a Server Component.
                        }
                    },
                },
            }
        );

        let error = null;
        console.log("[AuthCallback] Attempting to verify token/code...");

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
            console.log("[AuthCallback] Success! Redirecting to target with session cookies.");
            return response;
        }

        console.error("[AuthCallback] Auth error:", error.message);
    }

    // Default fallback to login if error or no tokens
    console.log("[AuthCallback] No valid session, falling back to login.");
    return NextResponse.redirect(loginUrl.toString());
}
