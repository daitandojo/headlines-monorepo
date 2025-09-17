// src/app/api/auth/login/route.js (version 2.3)
import { NextResponse } from 'next/server'
import * as jose from 'jose'
import bcrypt from 'bcryptjs'
import { env } from '@/lib/env.mjs'
import dbConnect from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'

const JWT_COOKIE_NAME = 'headlines-jwt'

export async function POST(request) {
  try {
    await dbConnect()
    const { email, password } = await request.json()
    console.log(`[API Login] Attempting login for: ${email}`)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const user = await Subscriber.findOne({
      email: email.toLowerCase().trim(),
      isActive: true,
    }).select('+password')

    if (!user) {
      console.warn(`[API Login] Auth failed: No active user found for ${email}`)
      return NextResponse.json(
        { error: 'Access is restricted to existing users only.' },
        { status: 401 }
      )
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password)

    if (!isPasswordMatch) {
      console.warn(`[API Login] Auth failed: Incorrect password for ${email}`)
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
    }

    console.log(`[API Login] Authentication successful for ${email}. Generating JWT.`)
    const secret = new TextEncoder().encode(env.JWT_SECRET)

    // START: CRITICAL FIX FOR JWT PAYLOAD
    // Ensure the userId is a plain string before signing. Mongoose ObjectIds
    // can otherwise be serialized into complex objects.
    const token = await new jose.SignJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    })
      // END: CRITICAL FIX
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
    console.error('[API Login Error]', error)
    return NextResponse.json(
      { error: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}
