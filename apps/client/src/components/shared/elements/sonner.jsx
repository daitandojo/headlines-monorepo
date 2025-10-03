'use client'
// import { useTheme } from 'next-themes'
// import { Toaster as Sonner } from 'sonner'
import { useEffect, useState } from 'react'

const Toaster = ({ ...props }) => {
  // const { theme = 'system' } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render on server or until mounted to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <>HELLO</>
    // <Sonner
    //   theme={theme}
    //   className="toaster group"
    //   toastOptions={{
    //     classNames: {
    //       toast:
    //         'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
    //       description: 'group-[.toast]:text-muted-foreground',
    //       actionButton:
    //         'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
    //       cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
    //     },
    //   }}
    //   {...props}
    // />
  )
}

export { Toaster }
