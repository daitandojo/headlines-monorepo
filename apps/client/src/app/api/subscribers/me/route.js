// src/app/api/subscribers/me/route.js (version 1.0)
'use server'

import { NextResponse } from 'next/server'
import * as jose from 'jose'
import { env } from '@/lib/env.mjs'
import dbConnect from '@/lib/mongodb'
import Subscriber from '@/models/Subscriber'

const JWT_COOKIE_NAME = 'headlines-jwt'

async function getUserIdFromToken(request) {
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload.userId
  } catch (e) {
    return null
  }
}

export async function GET(request) {
  try {
    const userId = await getUserIdFromToken(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    await dbConnect()
    const user = await Subscriber.findById(userId).lean()

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Password is not selected by default, so this is safe
    return NextResponse.json(user)
  } catch (error) {
    console.error('[API /me Error]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
