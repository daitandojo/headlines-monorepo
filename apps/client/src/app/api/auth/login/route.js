// apps/client/src/app/api/auth/login/route.js
import { NextResponse } from 'next/server'
import { loginUser } from '@headlines/actions'
import * as jose from 'jose'
import { env } from '@headlines/config/server'

const JWT_COOKIE_NAME = 'headlines-jwt'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // 1. Call the centralized business logic
    const result = await loginUser({ email, password })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    const user = result.user

    // 2. Handle HTTP-specific tasks (JWT creation and cookie setting)
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
      maxAge: 60 * 60 * 24 * 30, // 30 days
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
