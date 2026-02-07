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

    // If no company found for this domain, 404
    if (!company) {
        // In dev, we might want to allow a loose match or show a debug page
        // notFound()
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
                <Link href={`/portal/${domain}`}>
                    {branding.logo_url ? (
                        <img src={branding.logo_url} alt={company?.name || 'Company Logo'} className="h-8 object-contain" />
                    ) : (
                        <span className="font-bold text-xl text-primary">{company?.name || 'Portal'}</span>
                    )}
                </Link>
                <nav className="flex gap-4">
                    <Link href={`/portal/${domain}/chat`} className="text-sm font-medium hover:text-primary transition-colors">Chat</Link>
                    <Link href={`/portal/${domain}/login`} className="text-sm font-medium hover:text-primary transition-colors">Login</Link>
                </nav>
            </header>
            <main className="flex-1 bg-gray-50/50">
                {children}
            </main>
        </div>
    )
}
