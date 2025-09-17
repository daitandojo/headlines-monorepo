// packages/auth/src/AuthProvider.js (version 8.1.0)
'use client'

import { createContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoadingOverlay } from '@headlines/ui'
import { updateUserFilterPreference, updateUserProfile } from '@headlines/data-access'

const AuthContext = createContext(null)

export function AuthProvider({ children, appType }) {
  const [user, setUser] = useState(null)
  const [authStatus, setAuthStatus] = useState('verifying')
  const router = useRouter()

  const fetchUser = useCallback(async () => {
    // For admin app in dev, create a mock user session instantly.
    if (appType === 'admin' && process.env.NODE_ENV === 'development') {
      setUser({
        _id: 'dev_admin_id',
        firstName: 'Admin',
        role: 'admin',
        filterPreferences: { globalCountryFilter: [] },
      })
      setAuthStatus('authenticated')
      return
    }

    // For the client app, fetch the real user.
    try {
      const res = await fetch('/api/subscribers/me')
      if (res.ok) {
        setUser(await res.json())
        setAuthStatus('authenticated')
      } else {
        setUser(null)
        setAuthStatus('unauthenticated')
      }
    } catch (error) {
      setUser(null)
      setAuthStatus('unauthenticated')
    }
  }, [appType])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const login = async (email, password) => {
    setAuthStatus('loading')
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await response.json()
    if (response.ok) {
      toast.success(`Welcome back, ${data.user.firstName}!`)
      window.location.assign('/events')
    } else {
      toast.error(data.error || 'Login failed.')
      setAuthStatus('unauthenticated')
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setAuthStatus('unauthenticated')
    toast.info('You have been logged out.')
    window.location.assign('/login')
  }

  const updateUserPreferences = async (updateData) => {
    if (!user) return
    const result = await updateUserProfile({ userId: user._id, updateData })
    if (result.success && result.user) {
      setUser(result.user)
      toast.success('Profile updated successfully.')
    } else {
      toast.error('Failed to update profile.', { description: result.error })
      await fetchUser() // Re-fetch to revert optimistic update
    }
  }

  const updateFilters = useCallback(
    async (filterData) => {
      if (!user) return
      const result = await updateUserFilterPreference(filterData)
      if (result.success && result.user) {
        setUser(result.user)
      } else {
        toast.error('Failed to save filter settings.', { description: result.error })
        await fetchUser()
      }
    },
    [user, fetchUser]
  )

  const value = {
    user,
    isLoading: authStatus === 'loading' || authStatus === 'verifying',
    login,
    logout,
    updateUserPreferences,
    updateFilters,
  }

  if (authStatus === 'verifying') {
    return <LoadingOverlay isLoading={true} text="Verifying session..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
