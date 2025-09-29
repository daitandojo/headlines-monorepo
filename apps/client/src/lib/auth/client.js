// Full Path: headlines/src/lib/auth/client.js
'use client'

import { useContext } from 'react'
import { AuthContext } from './AuthProvider'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export { AuthProvider } from './AuthProvider'
