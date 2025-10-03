// apps/client/src/app/not-found.jsx
export default function NotFound() {
  // The not-found component renders within the root layout,
  // so it does not need its own <html> or <body> tags.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404 - Not Found</h1>
      <a href="/" className="mt-4 text-blue-500">
        Go Home
      </a>
    </div>
  )
}
