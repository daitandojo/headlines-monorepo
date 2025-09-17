// src/app/admin/layout.js (version 1.0)
import { Providers } from '../providers'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminNavTabs } from '@/components/admin/AdminNavTabs'
import { AuthProvider } from '@/context/AuthContext'

export const metadata = {
  title: 'Admin Command Center',
  description: 'Manage users and data sources for the Headlines platform.',
}

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
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
