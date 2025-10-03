// File: apps/client/src/components/admin/DesktopOnlyWrapper.jsx

'use client'

import { useState, useEffect } from 'react'
import { Monitor, Smartphone } from 'lucide-react'

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 1024) // lg breakpoint in Tailwind
    }

    // Check on initial mount
    checkScreenSize()

    // Add event listener for window resize
    window.addEventListener('resize', checkScreenSize)

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return isDesktop
}

export function DesktopOnlyWrapper({ children }) {
  const isDesktop = useIsDesktop()

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground text-center p-4">
        <Monitor className="h-16 w-16 mb-4 text-primary" />
        <h1 className="text-2xl font-bold">Admin Panel is Desktop-Only</h1>
        <p className="mt-2 text-muted-foreground max-w-sm">
          For the best experience and full functionality, please access the admin command
          center on a larger screen.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
