// File: apps/copyboard/src/app/api/auth/login/route.js (Corrected)

import { NextResponse } from 'next/server'
import { loginUser } from '@headlines/data-access/next'
import * as jose from 'jose'
import { env } from '@headlines/config/next'
import { initializeSharedLogic } from '@/lib/init-shared-logic' // <-- Import initialization

const JWT_COOKIE_NAME = 'headlines-jwt'

export async function POST(request) {
  try {
    // Explicitly initialize for this public route
    await initializeSharedLogic()

    const { email, password } = await request.json()

    const result = await loginUser({ email, password })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    const user = result.user

    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const token = await new jose.SignJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(secret)

    const response = NextResponse.json({
      user: {
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
        role: user.role,
      },
    })

    response.cookies.set({
      name: JWT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (error) {
    console.error('[API Login Route Error]', error)
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
