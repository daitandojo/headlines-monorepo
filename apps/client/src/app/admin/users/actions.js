// apps/client/src/app/admin/users/actions.js
'use server'

import {
  updateSubscriber,
  deleteSubscriber,
  createSubscriberWithPassword,
  updateSubscriberPassword,
} from '@headlines/data-access/next'
import { createAdminAction } from '@/lib/actions/createAdminAction'
import { userCreateSchema, userUpdateSchema } from '@headlines/models/schemas'
import dbConnect from '@headlines/data-access/dbConnect/next'

// This action is more complex due to password handling, so it uses the factory pattern slightly differently.
export const updateUserAction = async (userId, updateData) => {
  // 1. Validate the full payload first.
  const validation = userUpdateSchema.safeParse(updateData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }
  const validatedData = validation.data

  // 2. Create the core logic function to be wrapped by the action factory.
  const coreLogic = async () => {
    // Handle password update separately as it requires special handling (hashing).
    if (validatedData.password) {
      const passwordResult = await updateSubscriberPassword(
        userId,
        validatedData.password
      )
      if (!passwordResult.success) {
        return passwordResult // Propagate error from password update
      }
      // Remove password from the main update payload
      delete validatedData.password
    }

    // Update the rest of the user data if any fields remain.
    if (Object.keys(validatedData).length > 0) {
      return updateSubscriber(userId, validatedData)
    }

    // If only the password was updated, return success.
    return { success: true }
  }

  // 3. Execute the logic within the action factory for connection and revalidation.
  return createAdminAction(coreLogic, '/admin/users')()
}

export const deleteUserAction = createAdminAction(deleteSubscriber, '/admin/users')

export const createUserAction = createAdminAction(async (userData) => {
  const validation = userCreateSchema.safeParse(userData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }
  // createSubscriberWithPassword already handles hashing, so we can call it directly.
  return createSubscriberWithPassword(validation.data)
}, '/admin/users')
