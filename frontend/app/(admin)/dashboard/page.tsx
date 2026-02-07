export default function AdminDashboard() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="mt-4 text-gray-600">Welcome to the Blukastor administration panel.</p>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900">Companies</h3>
                    <p className="mt-2 text-3xl font-bold">1</p>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900">Active Portals</h3>
                    <p className="mt-2 text-3xl font-bold">1</p>
                </div>
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="font-semibold text-gray-900">Total Users</h3>
                    <p className="mt-2 text-3xl font-bold">1</p>
                </div>
            </div>
        </div>
    )
}
