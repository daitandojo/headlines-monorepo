// apps/client/src/lib/auth/AuthProvider.js
'use client'

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SplashScreen } from '@/components/shared/screen/SplashScreen'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true) // Start in a loading state
  const router = useRouter()
  const pathname = usePathname()

  // This effect runs once on mount to check the user's session from the API
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session')
        if (!response.ok) {
          throw new Error('No active session')
        }
        const data = await response.json()
        setUser(data.user)
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

    const isPublicPage = pathname === '/'
    const isAuthPage = pathname.startsWith('/login')
    const isAdminPage = pathname.startsWith('/admin')

    if (!user && !isPublicPage && !isAuthPage) {
      router.push('/')
    } else if (user && (isPublicPage || isAuthPage)) {
      router.push('/events')
    } else if (user && user.role !== 'admin' && isAdminPage) {
      router.push('/events')
    }
  }, [user, isLoading, pathname, router])

  const login = async (email, password) => {
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

  const signup = async (signupData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Account created successfully!')
        setUser(data.user) // Log the user in, which triggers the redirect effect
        return { success: true }
      } else {
        toast.error('Signup Failed', { description: data.error })
        return { success: false, error: data.error }
      }
    } catch (error) {
      toast.error('Signup Failed', { description: 'Could not connect to the server.' })
      return { success: false, error: 'Network error' }
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    setUser(null) // This will trigger the redirect effect
  }

  const updateUserPreferences = useCallback(async (updateData) => {
    // This is an optimistic update for a better UX
    setUser((prevUser) => ({ ...prevUser, ...updateData }))
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const updatedUser = await response.json()
      if (!response.ok) throw new Error(updatedUser.error)
      setUser(updatedUser) // Sync with the server's response
      toast.success('Preferences saved.')
    } catch (error) {
      toast.error('Failed to save preferences', { description: error.message })
    }
  }, [])

  const value = { user, isLoading, login, signup, logout, updateUserPreferences }

  // While checking session, show a splash screen.
  if (isLoading) {
    return <SplashScreen />
  }

  const isPublicOrAuthPage = pathname === '/' || pathname.startsWith('/login')

  // If we are on a public page OR we have a user, render the children.
  if (isPublicOrAuthPage || user) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }

  // Otherwise, we are on a protected page without a user. Show the splash screen
  // while the redirect effect navigates them away.
  return <SplashScreen />
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
