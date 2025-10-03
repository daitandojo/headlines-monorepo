// apps/client/src/app/api-admin/actions.js
'use server'

// --- START DEFINITIVE FIX ---
// This Server Action file is the "caller" and is now responsible for
// establishing the database connection before executing core logic.
import dbConnect from '@headlines/data-access/dbConnect/next'
// --- END DEFINITIVE FIX ---
import {
  linkOpportunityToEvent,
  unlinkOpportunityFromEvent,
} from '@headlines/data-access'
import { revalidatePath } from 'next/cache'

export async function linkOpportunityToEventAction(eventId, opportunityId) {
  await dbConnect() // Establish connection
  const result = await linkOpportunityToEvent(eventId, opportunityId)
  if (result.success) {
    revalidatePath('/admin/events')
    revalidatePath('/admin/opportunities')
  }
  return result
}

export async function unlinkOpportunityFromEventAction(eventId, opportunityId) {
  await dbConnect() // Establish connection
  const result = await unlinkOpportunityFromEvent(eventId, opportunityId)
  if (result.success) {
    revalidatePath('/admin/events')
    revalidatePath('/admin/opportunities')
  }
  return result
}
