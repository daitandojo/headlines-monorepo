// apps/client/src/lib/auth/AuthProvider.js
'use client'

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SplashScreen } from '@/components/shared/screen/SplashScreen'
import useAppStore from '../store/use-app-store'

export const AuthContext = createContext(null)

export function AuthProvider({ initialUser, children }) {
  const [user, setUser] = useState(initialUser)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // This effect simply manages the loading screen visibility
  useEffect(() => {
    // We can show the app as soon as we know the initial user state.
    const timer = setTimeout(() => setIsLoading(false), 500) // Brief splash screen
    return () => clearTimeout(timer)
  }, [])

  // Effect for redirection logic
  useEffect(() => {
    if (isLoading) return

    const isPublicPage = pathname === '/'
    const isAdminPage = pathname.startsWith('/admin')

    if (!user && !isPublicPage) {
      router.push('/')
    } else if (user && isPublicPage) {
      router.push('/events')
    } else if (user && user.role !== 'admin' && isAdminPage) {
      router.push('/events')
    }
  }, [user, isLoading, pathname, router])

  const login = async (email, password) => {
    // ... login logic ...
    // On success:
    // setUser(data.user)
    // window.location.href = '/events'
    // return true
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Login successful!')
        setUser(data.user)
        window.location.href = '/events' // Force a hard reload
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
    // ... signup logic ...
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Account created successfully!')
        setUser(data.user)
        window.location.href = '/events' // Force a hard reload
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
    setUser(null)
    window.location.href = '/' // Force a hard reload
  }

  const updateUserPreferences = useCallback(async (updateData) => {
    // ... remains the same
  }, [])

  const value = { user, isLoading, login, signup, logout, updateUserPreferences }

  if (isLoading) {
    return <SplashScreen />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
