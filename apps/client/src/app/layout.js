// apps/client/src/app/layout.js
import './globals.css'
import { AppProviders } from './providers'

export const metadata = {
  title: 'Headlines Client',
  description: 'A stable foundation for the Headlines app.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
