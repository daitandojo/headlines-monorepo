// apps/client/src/app/api/auth/signup/route.js
import { NextResponse } from 'next/server'
import { createSubscriberWithPassword } from '@headlines/data-access/next'
import { signupSchema } from '@headlines/models/schemas'
import dbConnect from '@headlines/data-access/dbConnect/next'
import * as jose from 'jose'
import { env } from '@headlines/config/next'

const JWT_COOKIE_NAME = 'headlines-jwt'

export async function POST(request) {
  try {
    await dbConnect()

    const body = await request.json()
    const validation = signupSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, email, password, countries, plan } = validation.data
    const [firstName, ...lastNameParts] = name.split(' ')
    const lastName = lastNameParts.join(' ')

    const createResult = await createSubscriberWithPassword({
      email,
      password,
      firstName,
      lastName,
      countries: countries.map((c) => ({ name: c, active: true })),
      subscriptionTier: plan,
    })

    if (!createResult.success) {
      return NextResponse.json({ error: createResult.error }, { status: 409 }) // 409 Conflict for existing user
    }

    const user = createResult.user

    // User created, now create a session token (login)
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

    const response = NextResponse.json({ user })
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
    console.error('[API Signup Error]', error)
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
