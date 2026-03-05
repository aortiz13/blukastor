import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AcceptPortalInvitePage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    // 1. Validate token
    const { data: invite, error: inviteError } = await serviceClient
        .from('portal_invites')
        .select('*, client_companies(name, custom_domain)')
        .eq('token', token)
        .single()

    if (inviteError || !invite) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-lg text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">!</div>
                    <h1 className="text-2xl font-bold text-gray-900">Invitación no válida</h1>
                    <p className="text-gray-500">Este enlace de invitación no existe o ya fue utilizado.</p>
                    <Link href="/login" className="inline-block bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition text-sm">
                        Ir al Login
                    </Link>
                </div>
            </div>
        )
    }

    // Check expiry
    if (new Date(invite.expires_at) < new Date()) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-lg text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">⏱</div>
                    <h1 className="text-2xl font-bold text-gray-900">Invitación expirada</h1>
                    <p className="text-gray-500">Este enlace de invitación ha expirado. Solicita uno nuevo al administrador.</p>
                    <Link href="/login" className="inline-block bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition text-sm">
                        Ir al Login
                    </Link>
                </div>
            </div>
        )
    }

    // 2. Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        // Redirect to login, preserving the invite token as a return path
        redirect(`/login?next=/portal-invite/${token}`)
    }

    // 3. Accept the invite — create contact and link
    const companyId = invite.client_company_id
    const company = invite.client_companies as any

    // Check if contact already exists for this user + company
    const { data: existingContact } = await serviceClient
        .from('contacts')
        .select('id')
        .eq('user_id', user.id)
        .eq('client_company_id', companyId)
        .maybeSingle()

    let contactId = existingContact?.id

    if (!contactId) {
        // Create contact
        const { data: newContact, error: contactError } = await serviceClient
            .from('contacts')
            .insert({
                user_id: user.id,
                client_company_id: companyId,
                push_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
                phone: user.phone || '',
                first_seen: new Date().toISOString(),
            })
            .select('id')
            .single()

        if (contactError) {
            console.error('Error creating contact:', contactError)
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white rounded-3xl p-10 max-w-md w-full shadow-lg text-center space-y-4">
                        <h1 className="text-2xl font-bold text-gray-900">Error</h1>
                        <p className="text-gray-500">No se pudo procesar la invitación. Intenta de nuevo o contacta al administrador.</p>
                    </div>
                </div>
            )
        }
        contactId = newContact.id
    }

    // Check if user_company_link already exists
    const { data: existingLink } = await serviceClient
        .from('user_company_links')
        .select('contact_id')
        .eq('contact_id', contactId)
        .eq('company_id', companyId)
        .maybeSingle()

    if (!existingLink) {
        // Create user_company_link
        await serviceClient
            .from('user_company_links')
            .insert({
                contact_id: contactId,
                company_id: companyId,
                relation: invite.role === 'admin' ? 'admin' : invite.role === 'viewer' ? 'viewer' : 'member',
                verified: true,
                invite_status: 'accepted',
            })
    }

    // 4. Delete the invite (consumed)
    await serviceClient
        .from('portal_invites')
        .delete()
        .eq('id', invite.id)

    // 5. Redirect to the company's portal
    const domain = company?.custom_domain || companyId
    redirect(`/${domain}/dashboard`)
}
