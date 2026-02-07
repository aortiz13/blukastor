export default function ContentManagerPage() {
    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Content Manager</h1>
                <p className="mt-4 text-gray-500">Coming Soon: Schedule social posts and manage creatives.</p>
                <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="border p-4 rounded bg-gray-50 opacity-50">
                        <h3 className="font-semibold">Editor & Scheduler</h3>
                    </div>
                    <div className="border p-4 rounded bg-gray-50 opacity-50">
                        <h3 className="font-semibold">Content Gallery</h3>
                    </div>
                </div>
            </div>
        </div>
    )
}
