// File (4 of 5): headlines/src/app/(client)/client-layout-wrapper.js
'use client'

import { AppShell } from '@/app/_components/AppShell'

// This is a Client Component that acts as a bridge. It receives server-fetched props
// and passes them to the AppShell, which can now safely use client hooks.
export function ClientLayoutWrapper({ children, serverProps }) {
  return <AppShell serverProps={serverProps}>{children}</AppShell>
}