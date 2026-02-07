import { getCompanyByDomain } from '@/lib/data/companies'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function PortalLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ domain: string }>
}) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const company = await getCompanyByDomain(domain)

    // If no company found for this domain, show a "Not Found" / "Setup" screen
    // This handles Vercel Preview URLs that are not in the database
    if (!company) {
        return (
            <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-gray-50 text-gray-900">
                <h1 className="text-4xl font-bold">Domain Not Configured</h1>
                <p className="max-w-md text-center text-gray-600">
                    The domain <code className="bg-gray-200 px-1 py-0.5 rounded text-sm">{domain}</code> is not mapped to any company in Blukastor.
                </p>
                <div className="text-sm text-gray-500">
                    <p>If you are the admin, please add this domain to the `companies` table.</p>
                </div>
            </div>
        )
    }

    const branding = company?.frontend_config as any || {}
    const primaryColor = branding.primary_color || '#000000'

    return (
        <div
            className="min-h-screen bg-white"
            style={{
                ['--primary' as any]: primaryColor,
            } as any}
        >
            <header className="border-b p-4 flex justify-between items-center bg-white sticky top-0 z-10 w-full"
                style={{ borderColor: 'var(--primary, #e5e7eb)' }}
            >
                <Link href="/">
                    {branding.logo_url ? (
                        <img src={branding.logo_url} alt={company?.name || 'Company Logo'} className="h-8 object-contain" />
                    ) : (
                        <span className="font-bold text-xl text-primary">{company?.name || 'Portal'}</span>
                    )}
                </Link>
                <nav className="flex gap-4">
                    <Link href="/chat" className="text-sm font-medium hover:text-primary transition-colors">Chat</Link>
                    <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
                </nav>
            </header>
            <main className="flex-1 bg-gray-50/50">
                {children}
            </main>
        </div>
    )
}
