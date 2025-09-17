// src/lib/adminAuth.js (version 1.0)
'use server'

import { cookies } from 'next/headers'
import * as jose from 'jose'
import { env } from '@/lib/env.mjs'

const JWT_COOKIE_NAME = 'headlines-jwt'

/**
 * Verifies the current user's JWT from cookies and checks if they are an admin.
 * To be used at the beginning of any admin-only server action.
 * @returns {Promise<{isAdmin: boolean, user?: object, error?: string}>}
 */
export async function verifyAdmin() {
  const token = cookies().get(JWT_COOKIE_NAME)?.value
  if (!token) {
    return { isAdmin: false, error: 'Authentication required.' }
  }
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)

    if (payload.role !== 'admin') {
      return { isAdmin: false, error: 'Administrator access required.' }
    }

    return { isAdmin: true, user: payload }
  } catch (e) {
    return { isAdmin: false, error: 'Invalid or expired session.' }
  }
}
