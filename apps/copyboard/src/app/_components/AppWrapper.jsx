// File: apps/copyboard/src/app/_components/AppWrapper.jsx
'use server'

import { verifySession } from '@/lib/auth/server'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { AppShell } from './AppShell'

export async function AppWrapper({ children }) {
  const { user } = await verifySession()

  return (
    <AuthProvider initialUser={user}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
