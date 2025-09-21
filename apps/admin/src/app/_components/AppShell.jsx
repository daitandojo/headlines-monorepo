// **File: apps/admin/src/app/_components/AppShell.jsx (SIMPLIFIED)**
'use client'

import MainNav from './main-nav'

export function AppShell({ children }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <MainNav />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="w-full mx-auto p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
