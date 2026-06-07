// apps/client/src/app/loading.jsx
export default function RootLoading() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
             style={{
               background: 'linear-gradient(135deg, #1e1e3f 0%, #2d1f4e 100%)',
               border: '1px solid rgba(255,255,255,0.1)',
               boxShadow: '0 0 30px rgba(59, 130, 246, 0.25)',
             }}>
          <svg className="w-8 h-8 text-blue-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4a8 8 0 0 0-8 8c0 3.7 2.5 6.8 6 7.7V22h4v-2.3c3.5-.9 6-4 6-7.7a8 8 0 0 0-8-8z"/>
            <path d="M9 12h6M12 9v6"/>
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
          HEADLINES
        </h1>
        <p className="text-sm text-slate-500 mt-3">Loading intelligence...</p>
      </div>
    </div>
  )
}