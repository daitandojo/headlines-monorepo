// Full Path: headlines/src/lib/auth/AuthProvider.js (REVISED)
'use client'

import React, { createContext, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoadingOverlay } from '@/components/shared/LoadingOverlay'

export const AuthContext = createContext(null)

export function AuthProvider({ initialUser, children }) {
  // 1. Set state from the server-provided prop, not a client-side fetch.
  const [user, setUser] = useState(initialUser)
  const [isLoading, setIsLoading] = useState(false) // Not initially loading
  const router = useRouter()
  const pathname = usePathname()

  // 2. This effect now correctly handles redirects based on the initial state.
  useEffect(() => {
    if (isLoading) return // Don't redirect during login/logout actions
    const isAuthPage = pathname.startsWith('/login')
    const isAdminPage = pathname.startsWith('/admin')

    if (!user && !isAuthPage) {
      router.push('/login')
    } else if (user && isAuthPage) {
      router.push(user.role === 'admin' ? '/dashboard' : '/events')
    } else if (user && isAdminPage && user.role !== 'admin') {
      toast.error('Access Denied', {
        description: 'You do not have permission to view this page.',
      })
      router.push('/events')
    }
  }, [user, pathname, router, isLoading])

  const login = async (email, password) => {
    setIsLoading(true)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (response.ok) {
      toast.success('Login successful!')
      setUser(data.user)
    } else {
      toast.error('Login Failed', { description: data.error })
    }
    setIsLoading(false)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    setUser(null)
  }

  const value = { user, isLoading, login, logout }

  // We only show this during login/logout actions now.
  if (isLoading) {
    return <LoadingOverlay isLoading={true} text="Authorizing..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
