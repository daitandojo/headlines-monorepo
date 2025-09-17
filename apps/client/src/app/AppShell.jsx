// src/app/AppShell.jsx (version 1.0)
'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider'
import { SplashScreen } from '@/components/SplashScreen'

/**
 * The AppShell component acts as the main client-side wrapper for the application.
 * It is responsible for orchestrating global client-side concerns like:
 * 1.  Service Worker registration.
 * 2.  Displaying an initial splash screen during application bootstrapping.
 * This ensures that these features are handled in one place, keeping the
 * root layout (`layout.js`) as a clean, server-rendered structure.
 */
export function AppShell({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  // State to control the visibility of the splash screen.
  // We start with `true` to show it on initial load.
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // This effect hides the splash screen after a short delay, allowing
    // the initial assets to load and the app to hydrate.
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500) // Display splash screen for 1.5 seconds

    return () => clearTimeout(timer)
  }, [])

  // The login page has its own minimal layout, so we don't need the AppShell logic for it.
  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <ServiceWorkerProvider>
      <AnimatePresence>{isLoading && <SplashScreen />}</AnimatePresence>
      {/* The main content is only mounted after the splash screen is gone */}
      {!isLoading && children}
    </ServiceWorkerProvider>
  )
}
