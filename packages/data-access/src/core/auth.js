// packages/data-access/src/core/auth.js
import { Subscriber } from '@headlines/models'
import bcrypt from 'bcryptjs'

const SALT_WORK_FACTOR = 10

/**
 * Creates a new subscriber with a securely hashed password.
 * @param {object} userData - The user data, including a plain-text password.
 * @returns {Promise<object>} The result of the creation operation.
 */
export async function createSubscriberWithPassword(userData) {
  if (!userData.password) {
    return { success: false, error: 'Password is required to create a user.' }
  }
  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR)
    userData.password = await bcrypt.hash(userData.password, salt)
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

/**
 * Updates a subscriber's password, ensuring it is properly hashed.
 * @param {string} userId - The ID of the user to update.
 * @param {string} newPassword - The new plain-text password.
 * @returns {Promise<object>} The result of the update operation.
 */
export async function updateSubscriberPassword(userId, newPassword) {
  if (!newPassword) {
    return { success: false, error: 'New password cannot be empty.' }
  }
  try {
    const salt = await bcrypt.genSalt(SALT_WORK_FACTOR)
    const hashedPassword = await bcrypt.hash(newPassword, salt)
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
    }).select('+password') // No .lean() here, we need the Mongoose method

    if (!user) {
      return { success: false, error: 'Invalid credentials or inactive account.' }
    }

    const isPasswordMatch = await user.comparePassword(password)

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
