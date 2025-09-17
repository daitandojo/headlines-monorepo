// apps/client/src/app/layout.js (version 8.0.0)
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@headlines/utils'
import { Toaster } from '@headlines/ui'
import { AppShell } from './AppShell'
import { AuthProvider } from '@headlines/auth/src/AuthProvider.js'

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = {
  manifest: '/manifest.json',
  title: 'Headlines',
  description: 'An interface to browse, search, and filter wealth event articles.',
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Headlines',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport = {
  themeColor: '#111827',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn('min-h-screen font-sans antialiased', fontSans.variable)}>
        <AuthProvider appType="client">
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
