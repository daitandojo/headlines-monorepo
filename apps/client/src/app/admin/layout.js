// 'use server'

import { verifyAdmin } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { DesktopOnlyWrapper } from '@/components/admin/DesktopOnlyWrapper'
import AdminNav from '@/components/admin/main-nav' // Import the nav component here

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }) {
  const { isAdmin } = await verifyAdmin()

  if (!isAdmin) {
    redirect('/events') // Redirect non-admins away
  }

  // This Server Component now defines the admin layout structure.
  return (
    <DesktopOnlyWrapper>
      <div className="flex h-screen bg-background">
        <AdminNav />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </DesktopOnlyWrapper>
  )
}
