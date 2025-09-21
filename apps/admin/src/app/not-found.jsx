// apps/admin/src/app/not-found.jsx (DEFINITIVE FIX V3)

export default function NotFound() {
    // This component must NOT contain <html> or <body> tags.
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <h2>Not Found</h2>
        <p>Could not find requested resource</p>
        <a href="/" style={{ color: 'blue' }}>Return Home</a>
      </div>
    </div>
  )
}
