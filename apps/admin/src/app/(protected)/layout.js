// apps/admin/src/app/(protected)/layout.js (version 2.0.0)
import { AppShell } from '../_components/AppShell'
import { AuthProvider } from '@headlines/auth/AuthProvider'
import { Providers } from '../providers'

export const dynamic = 'force-dynamic'

export default function ProtectedLayout({ children }) {
  return (
    <AuthProvider appType="admin">
      <Providers>
        <AppShell>{children}</AppShell>
      </Providers>
    </AuthProvider>
  )
}
