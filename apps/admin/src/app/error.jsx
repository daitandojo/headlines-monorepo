// apps/admin/src/app/error.jsx (DEFINITIVE FIX V3)
'use client'

export default function Error({ error, reset }) {
  // This component must NOT contain <html> or <body> tags.
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <h2>Something went wrong!</h2>
        <p>{error.message}</p>
        <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', border: '1px solid black', borderRadius: '0.25rem', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </div>
  )
}
