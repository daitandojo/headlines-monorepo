'use server'

import { getCookies } from './getCookies.js'
import * as jose from 'jose'
import { env } from '@headlines/config'
import { seedDevUser } from '@headlines/data-access/seed/dev-user.js'

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

export async function verifyAdmin() {
  const { headers } = await import('next/headers')
  const headersList = headers()

  if (
    process.env.NODE_ENV === 'development' &&
    headersList.get('x-dev-mode') === 'true'
  ) {
    await seedDevUser()
    const devUser = {
      userId: '662f831abb28052123530a43',
      email: 'reconozco@gmail.com',
      role: 'admin',
    }
    return { isAdmin: true, user: devUser, error: null }
  }

  const { user, error } = await verifySession()
  if (error || user?.role !== 'admin') {
    return {
      isAdmin: false,
      error: error || 'Administrator access required.',
      user: null,
    }
  }
  return { isAdmin: true, user, error: null }
}
