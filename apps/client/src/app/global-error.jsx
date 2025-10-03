// apps/client/src/app/global-error.jsx
'use client'

export default function GlobalError({ error, reset }) {
  // Although Next.js docs suggest this component needs its own <html> and <body> tags,
  // the build process throws an error indicating it's being wrapped by the root layout anyway.
  // Removing them resolves the build failure.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-4xl font-bold">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Try again
      </button>
    </div>
  )
}
