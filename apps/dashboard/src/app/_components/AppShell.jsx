// File: apps/copyboard/src/app/_components/AppShell.jsx

'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/client/Header'
import { MainNavTabs } from '@/components/client/MainNavTabs'

// Placeholder for AdminNav
const AdminNav = () => <div className="w-64 bg-gray-800 p-4 text-white">Admin Nav</div>

// The AppShell now expects serverProps to pass to the Header and children for the page content.
export function AppShell({ children, serverProps }) {
  const pathname = usePathname()

  const isLoginPage = pathname.startsWith('/login')
  const isAdminPage = pathname.startsWith('/admin')
  const isClientPage = !isLoginPage && !isAdminPage

  if (isLoginPage) {
    return <>{children}</>
  }

  // Admin layout remains the same for now
  if (isAdminPage) {
    return (
      <div className="flex h-screen">
        <AdminNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    )
  }

  // Client layout now uses the real components and renders children in the main tag
  if (isClientPage) {
    return (
      <div className="container mx-auto p-4 md:p-8 flex flex-col min-h-screen">
        <Header {...serverProps} />
        <div className="sticky top-[5px] z-30 my-4">
          <MainNavTabs />
        </div>
        <main className="flex-grow flex flex-col mt-0 min-h-0">{children}</main>
      </div>
    )
  }

  // Fallback to render children if no other condition is met
  return <>{children}</>
}
