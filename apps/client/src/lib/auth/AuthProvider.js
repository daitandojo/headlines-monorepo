// File: apps/client/src/lib/auth/AuthProvider.js (Full Version)
'use client'

import React, { createContext, useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoadingOverlay } from '@/components/shared/LoadingOverlay'

export const AuthContext = createContext(null)

export function AuthProvider({ initialUser, children }) {
  const [user, setUser] = useState(initialUser)
  const [isLoading, setIsLoading] = useState(!initialUser)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!initialUser) {
      setIsLoading(false)
    }
  }, [initialUser])

  useEffect(() => {
    const isAuthPage = pathname.startsWith('/login')
    if (!user && !isAuthPage) {
      router.push('/login')
    } else if (user && isAuthPage) {
      router.push('/events')
    }
  }, [user, pathname, router])

  const login = async (email, password) => {
    setIsLoading(true)
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
        return true
      } else {
        toast.error('Login Failed', { description: data.error })
        return false
      }
    } catch (error) {
      toast.error('Login Failed', { description: 'Could not connect to the server.' })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    setUser(null)
  }

  const updateUserPreferences = useCallback(async (updateData) => {
    setUser((prevUser) => ({ ...prevUser, ...updateData })) // Optimistic update
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const updatedUser = await response.json()
      if (!response.ok) throw new Error(updatedUser.error)
      setUser(updatedUser) // Sync with server response
      toast.success('Preferences saved.')
    } catch (error) {
      toast.error('Failed to save preferences', { description: error.message })
      // Here you might want to re-fetch the user to revert the optimistic update
    }
  }, [])

  const value = { user, isLoading, login, logout, updateUserPreferences }

  if (isLoading && !user) {
    return <LoadingOverlay isLoading={true} text="Authorizing..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
