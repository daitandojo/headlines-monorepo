// 'use server'

import { verifyAdmin } from '@/lib/auth/server'
import { DesktopOnlyWrapper } from '@/components/shared/screen/DesktopOnlyWrapper'
import AdminNav from '@/components/admin/main-nav'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }) {
  // We can still verify admin here to be extra safe, but the redirect is now handled client-side
  // by the AuthProvider, which prevents the rendering error.
  const { isAdmin } = await verifyAdmin()

  if (!isAdmin) {
    // Instead of redirecting, we can return null or a loading/access-denied state.
    // The AuthProvider will handle the redirect anyway.
    return null
  }

  return (
    <DesktopOnlyWrapper>
      <div className="flex h-screen bg-background">
        <AdminNav />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </DesktopOnlyWrapper>
  )
}
