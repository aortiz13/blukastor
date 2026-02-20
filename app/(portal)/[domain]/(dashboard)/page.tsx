import { redirect } from 'next/navigation'

export default async function PortalDashboard({ params }: { params: Promise<{ domain: string }> }) {
    // Redirect root dashboard to finance as per new requirement
    redirect('finance')
}
