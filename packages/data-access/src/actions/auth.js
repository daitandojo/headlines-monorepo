// packages/data-access/src/actions/auth.js (version 2.0.1)
'use server'

import { Subscriber } from '@headlines/models'
import dbConnect from '../dbConnect.js'
import bcrypt from 'bcryptjs'

export async function loginUser({ email, password }) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    await dbConnect()
    const user = await Subscriber.findOne({
      email: email.toLowerCase().trim(),
      isActive: true,
    })
      .select('+password')
      .lean()

    if (!user) {
      return { success: false, error: 'Invalid credentials or inactive account.' }
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password)

    if (!isPasswordMatch) {
      return { success: false, error: 'Invalid credentials or inactive account.' }
    }

    const { password: _, ...userPayload } = user
    return { success: true, user: userPayload }
  } catch (error) {
    console.error('[loginUser Action Error]', error)
    return { success: false, error: 'An internal server error occurred.' }
  }
}
