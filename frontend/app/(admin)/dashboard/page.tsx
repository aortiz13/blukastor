import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
    const supabase = await createClient()

    const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div>Error loading companies: {error.message}</div>
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Companies</h1>
                <Link href="/app/companies/new" className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
                    Create Company
                </Link>
            </div>

            <div className="rounded-md border">
                <div className="grid grid-cols-5 bg-gray-100 p-4 font-medium">
                    <div>Name</div>
                    <div>ID</div>
                    <div>Status</div>
                    <div>Branding</div>
                    <div>Actions</div>
                </div>
                {companies?.map((company) => (
                    <div key={company.id} className="grid grid-cols-5 border-t p-4 items-center">
                        <div className="font-semibold">{company.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{company.id}</div>
                        <div>
                            <span className={`px-2 py-1 rounded text-xs ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {company.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div>
                            {company.frontend_config ? (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Configured</span>
                            ) : (
                                <span className="text-xs text-gray-400">Default</span>
                            )}
                        </div>
                        <div>
                            <Link href={`/app/companies/${company.id}`} className="text-blue-600 hover:underline mr-4">
                                Manage
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
