// src/app/api/auth/logout/route.js (version 1.0)
'use server'

import { NextResponse } from 'next/server'

const JWT_COOKIE_NAME = 'headlines-jwt'

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Logged out successfully' })

    // Clear the cookie by setting its maxAge to 0
    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })

    console.log('[API Logout] JWT cookie cleared.')
    return response
  } catch (error) {
    console.error('[API Logout Error]', error)
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
