// src/hooks/useAuth.js (version 1.0)
'use client'

import { useContext } from 'react'
import AuthContext from '@/context/AuthContext'

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}