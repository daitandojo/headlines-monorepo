'use server'

import { revalidatePath } from 'next/cache'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { deleteEvent, updateEvent, getEventDetails } from '@headlines/data-access'

// These actions will be called by the client component.

export async function updateEventAction(eventId, updateData) {
  await dbConnect()
  const result = await updateEvent(eventId, updateData)
  if (result.success) {
    revalidatePath('/admin/events')
  }
  return result
}

export async function deleteEventAction(eventId) {
  await dbConnect()
  const result = await deleteEvent(eventId)
  if (result.success) {
    revalidatePath('/admin/events')
  }
  return result
}

export async function getEventDetailsAction(eventId) {
  await dbConnect()
  // getEventDetails is already a server function, we just wrap it
  // to ensure it's called within the Server Action context.
  return await getEventDetails(eventId)
}
