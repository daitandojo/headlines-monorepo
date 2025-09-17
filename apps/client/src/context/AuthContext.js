// src/context/AuthContext.jsx (version 1.2)
'use client'

import { createContext, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { updateUserProfile } from '@/actions/subscriber'

const AuthContext = createContext(null)
const PROFILE_UPDATE_CHANNEL = 'user_profile_updated'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const broadcastChannelRef = useRef(null)

  const fetchUser = useCallback(async () => {
    console.log('[AuthContext] Attempting to fetch user profile...')
    try {
      const res = await fetch('/api/subscribers/me')
      if (res.ok) {
        const userData = await res.json()
        console.log('[AuthContext] User profile fetched successfully:', userData)
        setUser(userData)
      } else {
        console.log('[AuthContext] No active session found or session expired.')
        setUser(null)
        await fetch('/api/auth/logout', { method: 'POST' })
      }
    } catch (error) {
      console.error('[AuthContext] Error fetching user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()

    // Initialize BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(PROFILE_UPDATE_CHANNEL)
      bc.onmessage = (event) => {
        if (event.data.type === 'USER_PROFILE_UPDATED') {
          console.log(
            '[Broadcast] Received profile update from another tab. Refetching user.'
          )
          toast.info('Your preferences have been updated in this tab.')
          fetchUser()
        }
      }
      broadcastChannelRef.current = bc

      return () => {
        bc.close()
      }
    }
  }, [fetchUser])

  const login = async (email, password) => {
    setIsLoading(true)
    console.log(`[AuthContext] Attempting login for ${email}...`)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success(`Welcome back, ${data.user.firstName}!`)
        await fetchUser()
        router.push('/events')
      } else {
        toast.error(data.error || 'Login failed.')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('[AuthContext] Login request failed:', error)
      toast.error('An unexpected error occurred during login.')
      setIsLoading(false)
    }
  }

  const logout = async () => {
    console.log('[AuthContext] Logging out...')
    setUser(null)
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.info('You have been logged out.')
    router.push('/login')
  }

  const updateUserPreferences = async (updateData) => {
    if (!user) return

    const previousUser = { ...user }
    setUser((currentUser) => ({ ...currentUser, ...updateData }))

    const result = await updateUserProfile({ userId: user._id, updateData })

    if (result.success) {
      toast.success('Preferences updated.')
      setUser(result.user)
      // Broadcast the update to other tabs
      broadcastChannelRef.current?.postMessage({ type: 'USER_PROFILE_UPDATED' })
    } else {
      toast.error('Failed to update preferences. Reverting.')
      setUser(previousUser)
    }
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    refetchUser: fetchUser,
    updateUserPreferences,
  }

  if (isLoading) {
    return <LoadingOverlay isLoading={true} text="Authenticating..." />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
