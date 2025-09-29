// packages/data-access/src/actions/relationships.js (version 2.0.0)
import { SynthesizedEvent, Opportunity } from '@headlines/models'
import dbConnect from '../dbConnect.js'
import { revalidatePath } from '../revalidate.js'
import mongoose from 'mongoose'

export async function linkOpportunityToEvent(eventId, opportunityId) {
  if (
    !mongoose.Types.ObjectId.isValid(eventId) ||
    !mongoose.Types.ObjectId.isValid(opportunityId)
  ) {
    return { success: false, error: 'Invalid ID format.' }
  }
  try {
    await dbConnect()
    await Promise.all([
      SynthesizedEvent.findByIdAndUpdate(eventId, {
        $addToSet: { relatedOpportunities: opportunityId },
      }),
      Opportunity.findByIdAndUpdate(opportunityId, { $addToSet: { events: eventId } }),
    ])
    await revalidatePath('/admin/events')
    await revalidatePath('/admin/opportunities')
    return { success: true, message: 'Relationship linked.' }
  } catch (e) {
    return { success: false, error: 'Database operation failed.' }
  }
}

export async function unlinkOpportunityFromEvent(eventId, opportunityId) {
  if (
    !mongoose.Types.ObjectId.isValid(eventId) ||
    !mongoose.Types.ObjectId.isValid(opportunityId)
  ) {
    return { success: false, error: 'Invalid ID format.' }
  }
  try {
    await dbConnect()
    await Promise.all([
      SynthesizedEvent.findByIdAndUpdate(eventId, {
        $pull: { relatedOpportunities: opportunityId },
      }),
      Opportunity.findByIdAndUpdate(opportunityId, { $pull: { events: eventId } }),
    ])
    await revalidatePath('/admin/events')
    await revalidatePath('/admin/opportunities')
    return { success: true, message: 'Relationship unlinked.' }
  } catch (e) {
    return { success: false, error: 'Database operation failed.' }
  }
}
