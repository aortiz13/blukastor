export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Welcome to Blukastor</h1>
      <div className="mt-8 flex gap-4">
        <a href="http://app.localhost:3000/dashboard" className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          Admin Login
        </a>
      </div>
    </div>
  )
}
