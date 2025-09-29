// apps/client/src/app/api/auth/logout/route.js
import { NextResponse } from 'next/server'

const JWT_COOKIE_NAME = 'headlines-jwt'

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' })
  response.cookies.set({
    name: JWT_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
