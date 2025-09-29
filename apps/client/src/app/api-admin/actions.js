'use server'

import dbConnect from '@headlines/data-access/dbConnect.js'
import {
  linkOpportunityToEvent,
  unlinkOpportunityFromEvent,
} from '@headlines/data-access'
import { revalidatePath } from 'next/cache'

// These actions perform the database work for the relationship API routes.
export async function linkOpportunityToEventAction(eventId, opportunityId) {
  await dbConnect()
  const result = await linkOpportunityToEvent(eventId, opportunityId)
  if (result.success) {
    revalidatePath('/admin/events')
    revalidatePath('/admin/opportunities')
  }
  return result
}

export async function unlinkOpportunityFromEventAction(eventId, opportunityId) {
  await dbConnect()
  const result = await unlinkOpportunityFromEvent(eventId, opportunityId)
  if (result.success) {
    revalidatePath('/admin/events')
    revalidatePath('/admin/opportunities')
  }
  return result
}
