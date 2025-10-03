// apps/client/src/app/api/auth/login/route.js
import { NextResponse } from 'next/server'
import { loginUser } from '@headlines/data-access/next'
import * as jose from 'jose'
import { env } from '@headlines/config/next'
import dbConnect from '@headlines/data-access/dbConnect/next' // This import is now valid
import { loginSchema } from '@headlines/models/schemas'
import { sendErrorAlert } from '@headlines/utils-server/next'
import { logger } from '@headlines/utils-shared'

// ... rest of the file
const JWT_COOKIE_NAME = 'headlines-jwt'

export async function POST(request) {
  try {
    await dbConnect()

    const body = await request.json()
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password } = validation.data
    logger.info(`Login attempt for user: ${email}`)
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
    sendErrorAlert(error, { origin: 'LOGIN_API_ROUTE' })
    logger.error({ err: error }, '[API Login Route Error]')
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
