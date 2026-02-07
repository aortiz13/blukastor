import { createClient } from '@/lib/supabase/server'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatWindow } from '@/components/chat/chat-window'
import { redirect } from 'next/navigation'

export default async function ChatPage({ params }: { params: Promise<{ domain: string }> }) {
    const supabase = await createClient()

    const { domain: rawDomain } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/portal/${rawDomain}/login`)
    }

    // Fetch contact_id for the user
    const { data: contact } = await supabase
        .schema('wa')
        .from('contacts')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

    if (!contact) {
        return <div>Error: Contact not found for user. Please contact support.</div>
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Sidebar: List of Agents */}
            <div className="w-80 border-r bg-gray-50/40">
                <ChatSidebar />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                <ChatWindow contactId={contact.id} companyId={contact.company_id} />
            </div>
        </div>
    )
}
