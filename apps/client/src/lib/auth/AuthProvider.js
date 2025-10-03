'use client'

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SplashScreen } from '@/components/shared/screen/SplashScreen' // Using your splash screen

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // Start in a loading state
  const router = useRouter()
  const pathname = usePathname()

  // This effect runs once on mount to check the user's session from an API endpoint
  useEffect(() => {
    async function checkSession() {
      try {
        // In a real app, you would fetch your session status from an API
        // For now, we simulate being logged out to force the login flow.
        const sessionUser = null
        setUser(sessionUser)
      } catch (error) {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [])

  // This effect is the single source of truth for redirection
  useEffect(() => {
    if (isLoading) return // Don't do anything while checking the session

    const isAuthPage = pathname.startsWith('/login')
    const isAdminPage = pathname.startsWith('/admin')

    if (!user && !isAuthPage) {
      router.push('/login')
    } else if (user && isAuthPage) {
      router.push('/events')
    } else if (user && user.role !== 'admin' && isAdminPage) {
      router.push('/events')
    }
  }, [user, isLoading, pathname, router])

  const login = async (email, password) => {
    // We don't need setIsLoading(true) here because the page will just render the form again on failure.
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Login successful!')
        setUser(data.user) // This will trigger the redirect effect
        return true
      } else {
        toast.error('Login Failed', { description: data.error })
        return false
      }
    } catch (error) {
      toast.error('Login Failed', { description: 'Could not connect to the server.' })
      return false
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    setUser(null) // This will trigger the redirect effect
  }

  const value = { user, isLoading, login, logout, updateUserPreferences: () => {} }

  // While checking the initial session, show a splash screen
  if (isLoading) {
    return <SplashScreen />
  }

  const isAuthPage = pathname.startsWith('/login')

  // If we are on a public page OR if the user is authenticated, render the app
  if (isAuthPage || user) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }

  // If the user is not logged in and not on a public page, show the splash screen
  // while the redirect effect above navigates them to /login.
  return <SplashScreen />
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
