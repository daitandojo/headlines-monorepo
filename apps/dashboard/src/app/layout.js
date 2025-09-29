// File: apps/copyboard/src/app/layout.js (Corrected Provider Structure)

import './globals.css'
import { AppProviders } from './providers'
import { AppWrapper } from './_components/AppWrapper'

export const metadata = {
  title: 'Copyboard App',
  description: 'A fresh start',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* 1. AppProviders is now the outermost client wrapper */}
        <AppProviders>
          {/* 2. AppWrapper is a SERVER component that fetches user data.
                 It renders its children, which will include the AppShell. */}
          <AppWrapper>{children}</AppWrapper>
        </AppProviders>
      </body>
    </html>
  )
}
