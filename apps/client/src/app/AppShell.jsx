// apps/client/src/app/AppShell.jsx (version 2.0.0)
'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { SplashScreen } from '@/components/SplashScreen'
import { useState, useEffect } from 'react'

export function AppShell({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [isLoading, setIsLoading] = useState(!isLoginPage)

  useEffect(() => {
    if (!isLoginPage) {
      const timer = setTimeout(() => setIsLoading(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [isLoginPage])

  // The login page has its own simple layout, so we just render its children directly.
  if (isLoginPage) {
    return <>{children}</>
  }

  // All other pages are wrapped in the ServiceWorkerProvider and get the splash screen.
  return (
    <ServiceWorkerProvider>
      <AnimatePresence>{isLoading && <SplashScreen />}</AnimatePresence>
      {!isLoading && children}
    </ServiceWorkerProvider>
  )
}
