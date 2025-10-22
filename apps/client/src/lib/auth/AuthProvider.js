// apps/client/src/lib/auth/AuthProvider.js
'use client'

import React, { createContext, useState, useEffect, useCallback, useContext } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SplashScreen } from '@/components/shared/screen/SplashScreen'
import useAppStore from '../store/use-app-store'
import { loginUser, signupUser } from '../api-client'

export const AuthContext = createContext(null)

export function AuthProvider({ initialUser, children }) {
  const [user, setUser] = useState(initialUser)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // Main routing and authentication logic
  useEffect(() => {
    if (isLoading) return

    const isPublicPage = pathname === '/' || pathname.startsWith('/login')
    const isAdminPage = pathname.startsWith('/admin')
    const isUpgradePage = pathname.startsWith('/upgrade')

    if (!user && !isPublicPage && !isUpgradePage) {
      router.push('/')
    } else if (user && (pathname === '/' || pathname === '/login')) {
      router.push('/events')
    } else if (user && user.role !== 'admin' && isAdminPage) {
      router.push('/events')
    }
  }, [user, isLoading, pathname, router])

  // --- START OF MODIFICATION ---
  // New effect to handle trial expiration redirection
  useEffect(() => {
    if (isLoading || !user) return

    const isTrialExpired =
      user.role !== 'admin' &&
      user.subscriptionTier === 'trial' &&
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt) < new Date()

    const isOnUpgradePage = pathname.startsWith('/upgrade')

    if (isTrialExpired && !isOnUpgradePage) {
      toast.error('Your trial has expired.', {
        description: 'Please upgrade your plan to continue accessing our intelligence.',
      })
      router.push('/upgrade')
    }
  }, [user, isLoading, pathname, router])
  // --- END OF MODIFICATION ---

  const login = async (email, password) => {
    // ... (unchanged)
    const result = await loginUser(email, password)
    if (result.success) {
      window.location.href = '/events'
      return true
    }
    return false
  }

  const signup = async (signupData) => {
    // ... (unchanged)
    const result = await signupUser(signupData)
    if (result.success) {
      window.location.href = '/events'
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  const logout = async () => {
    // ... (unchanged)
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    setUser(null)
    window.location.href = '/'
  }

  const updateUserPreferences = useCallback(async (updateData) => {
    // ... (unchanged)
    setUser((prev) => (prev ? { ...prev, ...updateData } : null))
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const updatedUser = await response.json()
      if (!response.ok) {
        throw new Error(updatedUser.error || 'Failed to update preferences.')
      }
      setUser(updatedUser)
      toast.success('Preferences updated successfully.')
    } catch (error) {
      toast.error('Update Failed', { description: error.message })
      const res = await fetch('/api/auth/session')
      if (res.ok) setUser((await res.json()).user)
    }
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
