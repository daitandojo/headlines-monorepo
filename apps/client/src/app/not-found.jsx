// apps/client/src/app/not-found.jsx
// apps/admin/src/app/not-found.jsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-lg">Page not found</p>
      <a 
        href="/" 
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Go Home
      </a>
    </div>
  )
}