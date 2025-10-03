// apps/client/src/app/admin/users/actions.js
'use server'

import { revalidatePath } from 'next/cache'
import dbConnect from '@headlines/data-access/dbConnect/next'
import {
  updateSubscriber,
  deleteSubscriber,
  createSubscriber,
  updateSubscriberPassword,
} from '@headlines/data-access'
import {
  userCreateSchema,
  userUpdateSchema,
} from '@headlines/models/schemas' // Import Zod schemas

export async function updateUserAction(userId, updateData) {
  const validation = userUpdateSchema.safeParse(updateData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }
  const validatedData = validation.data

  await dbConnect()

  if (validatedData.password) {
    const passwordResult = await updateSubscriberPassword(userId, validatedData.password)
    if (!passwordResult.success) {
      return passwordResult
    }
    delete validatedData.password
  }

  if (Object.keys(validatedData).length > 0) {
    const result = await updateSubscriber(userId, validatedData)
    if (result.success) {
      revalidatePath('/admin/users')
    }
    return result
  }

  revalidatePath('/admin/users')
  return { success: true }
}

export async function deleteUserAction(userId) {
  await dbConnect()
  const result = await deleteSubscriber(userId)
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}

export async function createUserAction(userData) {
  const validation = userCreateSchema.safeParse(userData)
  if (!validation.success) {
    return { success: false, error: 'Invalid data.', details: validation.error.flatten() }
  }

  await dbConnect()
  const result = await createSubscriber(validation.data)
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}
