import { getCompanyByDomain } from '@/lib/data/companies'

export default async function LoginPage({ params }: { params: Promise<{ domain: string }> }) {
    const { domain: rawDomain } = await params
    const domain = decodeURIComponent(rawDomain)
    const company = await getCompanyByDomain(domain)
    const branding = company?.frontend_config as any || {}

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
                <div className="text-center">
                    {branding.logo_url && <img src={branding.logo_url} alt="Logo" className="mx-auto h-12 w-auto" />}
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                        Sign in to {company?.name || 'Portal'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" action="#" method="POST">
                    {/* TODO: Implement Supabase Auth Action */}
                    <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input id="email" name="email" type="email" required className="relative block w-full rounded border-0 p-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="Email address" />
                    </div>
                    <div>
                        <button type="submit" className="flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600" style={{ backgroundColor: branding.primary_color }}>
                            Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
