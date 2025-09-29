// Full Path: headlines/src/app/(admin)/layout.js
import { verifyAdmin } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import { DesktopOnlyWrapper } from '@/components/admin/DesktopOnlyWrapper'
import { AppShell } from '@/app/_components/AppShell'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }) {
  const { isAdmin } = await verifyAdmin()

  if (!isAdmin) {
    redirect('/login')
  }

  // The AppShell will detect the /admin path and render the correct UI
  return (
    <DesktopOnlyWrapper>
      <AppShell>{children}</AppShell>
    </DesktopOnlyWrapper>
  )
}
