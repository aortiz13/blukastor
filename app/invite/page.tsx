'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function InvitePage() {
    const router = useRouter();
    const [message, setMessage] = useState('Verificando invitación...');
    const supabase = createClient();

    useEffect(() => {
        const handleInvite = async () => {
            // Check if we have a hash with access_token (Implicit flow)
            // Supabase client automatically handles this in onAuthStateChange if the URL has the fragment

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                    setMessage('Sesión iniciada. Redirigiendo...');
                    // Add a small delay to ensure cookies are propagated if needed, though usually instant
                    router.push('/administracion/update-password');
                    router.refresh();
                }
            });

            // Fallback: If no hash or invalid, check if we are already logged in
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push('/administracion/update-password');
            } else {
                // checking...
                // If after a timeout we are not signed in, show error?
                setTimeout(() => {
                    setMessage('No se encontró una invitación válida o el enlace ha expirado.');
                }, 5000);
            }

            return () => {
                subscription.unsubscribe();
            };
        };

        handleInvite();
    }, [supabase, router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-gray-50">
            <Loader2 className="h-8 w-8 animate-spin text-black" />
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}
