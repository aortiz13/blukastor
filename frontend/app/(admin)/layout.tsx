import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // TODO: Check for admin role

    return (
        <div className="flex h-screen flex-col">
            <header className="border-b p-4">
                <div className="flex items-center justify-between">
                    <span className="font-bold">Blukastor Admin</span>
                    <span>{user.email}</span>
                </div>
            </header>
            <main className="flex-1 overflow-auto bg-gray-50">
                {children}
            </main>
        </div>
    )
}
