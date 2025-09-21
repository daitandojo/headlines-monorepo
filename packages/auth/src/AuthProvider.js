// packages/auth/src/AuthProvider.js (version 2.0.0)
'use client'

import React, { createContext, useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoadingOverlay } from '@headlines/ui'

async function getSubscriberMeClient() {
  const res = await fetch('/api/subscribers/me')
  if (res.ok) return res.json()
  return null
}

export const AuthContext = createContext(null)

export function AuthProvider({ children, appType }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const fetchUser = useCallback(async () => {
    const data = await getSubscriberMeClient()
    setUser(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/login')) {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  const login = async (email, password) => {
    setLoading(true)
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    setLoading(false)
    if (response.ok) {
      toast.success('Login successful!')
      setUser(data.user)
      router.push(appType === 'admin' ? '/dashboard' : '/events')
    } else {
      toast.error('Login Failed', { description: data.error })
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    setUser(null)
    router.push('/login')
  }

  const updateUserPreferences = async (updateData) => {
    if (!user) return
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const updatedUser = await response.json()
      if (!response.ok) {
        throw new Error(updatedUser.error || 'Server error')
      }
      setUser(updatedUser)
      toast.success('Preferences updated successfully.')
    } catch (error) {
      toast.error('Failed to update preferences', { description: error.message })
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    updateUserPreferences,
  }

  if (loading && !pathname.startsWith('/login')) {
    return <LoadingOverlay isLoading={true} text="Initializing Session..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
