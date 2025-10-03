// apps/client/src/app/_components/AppShell.jsx
'use client'

import { usePathname } from 'next/navigation'

export function AppShell({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname.startsWith('/login') || pathname === '/'

  if (isLoginPage) {
    return <>{children}</>
  }

  // The AppShell no longer makes layout decisions or manages loading states.
  // It just renders its children within the application's main structure.
  // The splash screen and visibility are now fully controlled by AuthProvider.
  return <>{children}</>
}
