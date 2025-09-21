// packages/auth/src/useAuth.js (version 2.0.0)
'use client'

import { useContext } from 'react'
import { AuthContext } from './AuthProvider.js'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
