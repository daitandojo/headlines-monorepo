// apps/client/src/hooks/useAuth.js (version 2.0.0)
'use client'

import { useContext } from 'react'
import AuthContext from '@headlines/auth/src/AuthProvider.js'

/**
 * Provides access to the authentication context (user, login, logout, etc.).
 * This hook can only be used by components wrapped in an AuthProvider.
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
