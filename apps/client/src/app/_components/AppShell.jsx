'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { SplashScreen } from '@/components/shared/screen/SplashScreen'

export function AppShell({ children }) {
  const pathname = usePathname()
  const [isAppLoading, setIsAppLoading] = useState(true)

  useEffect(() => {
    // Basic loading splash screen logic
    if (pathname.startsWith('/login')) {
      setIsAppLoading(false)
    } else {
      const timer = setTimeout(() => setIsAppLoading(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  const isLoginPage = pathname.startsWith('/login')

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <>
      <AnimatePresence>{isAppLoading && <SplashScreen />}</AnimatePresence>
      <div style={{ visibility: isAppLoading ? 'hidden' : 'visible' }}>
        {/* The AppShell no longer makes layout decisions. It just provides the splash screen and renders its children. */}
        {children}
      </div>
    </>
  )
}
