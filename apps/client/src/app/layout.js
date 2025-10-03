// apps/client/src/app/layout.js
import './globals.css'
import { AppProviders } from './providers'
import { AppWrapper } from './_components/AppWrapper'

export const metadata = {
  title: 'Headlines Intelligence',
  description: 'AI-Powered Wealth Event Discovery.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <AppProviders>
          <AppWrapper>{children}</AppWrapper>
        </AppProviders>
      </body>
    </html>
  )
};