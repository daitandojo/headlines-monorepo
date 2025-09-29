'use server'

import { revalidatePath } from 'next/cache'
import dbConnect from '@headlines/data-access/dbConnect.js' // <-- Import dbConnect
import {
  updateSubscriber,
  deleteSubscriber,
  createSubscriber,
} from '@headlines/data-access'

// This file now uses the pure data logic functions from data-access
// and adds the Next.js-specific logic (dbConnect, revalidation).

export async function updateUserAction(userId, updateData) {
  // Establish connection at the start of the action
  await dbConnect()

  const result = await updateSubscriber(userId, updateData)
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}

export async function deleteUserAction(userId) {
  // Establish connection at the start of the action
  await dbConnect()

  const result = await deleteSubscriber(userId)
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}

export async function createUserAction(userData) {
  // Establish connection at the start of the action
  await dbConnect()

  const result = await createSubscriber(userData)
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}
