// apps/client/src/app/layout.js (version 2.0.0)
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@headlines/utils-shared'
import { Toaster } from '@headlines/ui'
import { AppShell } from './AppShell' // Import the new root AppShell

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata = {
  manifest: '/manifest.json',
  title: 'Headlines',
  description: 'An interface to browse, search, and filter wealth event articles.',
}

export const viewport = {
  themeColor: '#111827',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn('min-h-screen font-sans antialiased', fontSans.variable)}>
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  )
}
