// File: apps/client/src/app/layout.js
import './globals.css'
import { AppProviders } from './providers'
import { AppShell } from './_components/AppShell'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata = {
  title: 'Headlines Intelligence',
  description: 'An interface to browse, search, and filter wealth event articles.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background font-sans text-foreground">
        {/* The AppWrapper has been removed. AuthProvider is now in providers.jsx */}
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  )
}
