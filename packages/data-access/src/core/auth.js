// packages/data-access/src/core/auth.js
import { Subscriber } from '@headlines/models'
import bcryptjs from 'bcryptjs'

const SALT_WORK_FACTOR = 10

export async function createSubscriberWithPassword(userData) {
  if (!userData.password) {
    return { success: false, error: 'Password is required to create a user.' }
  }
  try {
    const salt = await bcryptjs.genSalt(SALT_WORK_FACTOR)
    userData.password = await bcryptjs.hash(userData.password, salt)
    const newUser = new Subscriber(userData)
    await newUser.save()
    const { password, ...userPayload } = newUser.toObject()
    return { success: true, user: userPayload }
  } catch (error) {
    if (error.code === 11000) {
      return { success: false, error: 'A user with this email already exists.' }
    }
    return { success: false, error: 'Failed to create subscriber.' }
  }
}

export async function updateSubscriberPassword(userId, newPassword) {
  if (!newPassword) {
    return { success: false, error: 'New password cannot be empty.' }
  }
  try {
    const salt = await bcryptjs.genSalt(SALT_WORK_FACTOR)
    const hashedPassword = await bcryptjs.hash(newPassword, salt)
    const result = await Subscriber.updateOne(
      { _id: userId },
      { password: hashedPassword }
    )
    if (result.matchedCount === 0) {
      return { success: false, error: 'User not found.' }
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update password.' }
  }
}

export async function loginUser({ email, password }) {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const user = await Subscriber.findOne({
      email: email.toLowerCase().trim(),
      isActive: true,
    }).select('+password')

    if (!user) {
      return { success: false, error: 'Invalid credentials or inactive account.' }
    }

    const isPasswordMatch = await bcryptjs.compare(password, user.password)

    if (!isPasswordMatch) {
      return { success: false, error: 'Invalid credentials or inactive account.' }
    }

    const { password: _, ...userPayload } = user.toObject()
    return { success: true, user: userPayload }
  } catch (error) {
    console.error('[loginUser Action Error]', error)
    return { success: false, error: 'An internal server error occurred.' }
  }
}
