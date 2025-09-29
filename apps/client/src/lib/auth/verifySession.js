'use server'

import { getCookies } from './getCookies.js'
import * as jose from 'jose'
import { env } from '@headlines/config/next'

const JWT_COOKIE_NAME = 'headlines-jwt'

async function verifyToken(token) {
  if (!token) return { user: null, error: 'No token provided.' }
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return { user: payload, error: null }
  } catch (e) {
    return { user: null, error: 'Invalid or expired session token.' }
  }
}

export async function verifySession() {
  const cookieStore = await getCookies()
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value
  return await verifyToken(token)
}

export async function getUserIdFromSession() {
  const { user } = await verifySession()
  return user ? user.userId : null
}

// This function is now simplified and has no database side-effects.
// It relies on a user having been seeded manually.
export async function verifyAdmin() {
  const { user, error } = await verifySession()

  // A simple check for a known dev user email can be a convenience.
  if (process.env.NODE_ENV === 'development' && user?.email === 'dev@headlines.dev') {
    return { isAdmin: true, user, error: null }
  }

  if (error || user?.role !== 'admin') {
    return {
      isAdmin: false,
      error: error || 'Administrator access required.',
      user: null,
    }
  }
  return { isAdmin: true, user, error: null }
}
