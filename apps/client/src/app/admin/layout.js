// apps/client/src/app/admin/layout.js (version 2.1 - Directive Fix)

// DEFINITIVE FIX: The "'use server'" directive is removed.
// This file is a Server Component, not a module of server actions.
// This allows the default export to be a regular (non-async) function.

import { Providers } from '../providers'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminNavTabs } from '@/components/admin/AdminNavTabs'
import { AuthProvider } from '@headlines/auth/src/AuthProvider.js'

export const metadata = {
  title: 'Admin Command Center',
  description: 'Manage users and data sources for the Headlines platform.',
}

export default function AdminLayout({ children }) {
  return (
    <AuthProvider appType="admin">
      <Providers>
        <div className="min-h-screen flex flex-col">
          <AdminHeader />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
            <AdminNavTabs />
            <main className="mt-8">{children}</main>
          </div>
        </div>
      </Providers>
    </AuthProvider>
  )
}