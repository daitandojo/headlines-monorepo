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

  useEffect(() => {
    if (isLoading) return

    const isPublicPage = pathname === '/' || pathname.startsWith('/login')
    const isAdminPage = pathname.startsWith('/admin')

    if (!user && !isPublicPage) {
      router.push('/')
    } else if (user && (pathname === '/' || pathname === '/login')) {
      router.push('/events')
    } else if (user && user.role !== 'admin' && isAdminPage) {
      router.push('/events')
    }
  }, [user, isLoading, pathname, router])

  const login = async (email, password) => {
    const result = await loginUser(email, password)
    if (result.success) {
      // Don't call setUser here, the page will hard reload
      window.location.href = '/events'
      return true
    }
    return false
  }

  const signup = async (signupData) => {
    const result = await signupUser(signupData)
    if (result.success) {
      window.location.href = '/events'
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    setUser(null)
    window.location.href = '/'
  }

  const updateUserPreferences = useCallback(async (updateData) => {
    setUser((prev) => (prev ? { ...prev, ...updateData } : null)) // Optimistic update
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
      setUser(updatedUser) // Update with confirmed data from server
      toast.success('Preferences updated successfully.')
    } catch (error) {
      toast.error('Update Failed', { description: error.message })
      // Revert optimistic update by refetching user session
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
