// apps/admin/src/app/layout.js
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@headlines/utils';
import { Toaster } from '@headlines/ui';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata = {
  title: 'Headlines Admin',
  description: 'Admin dashboard for Headlines platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn('min-h-screen font-sans antialiased', fontSans.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}