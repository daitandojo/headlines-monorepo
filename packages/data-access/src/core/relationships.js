// packages/data-access/src/core/relationships.js
import { SynthesizedEvent, Opportunity } from '@headlines/models'
import mongoose from 'mongoose'

// --- START DEFINITIVE FIX ---
// This file is now TRULY isomorphic and stateless. It does not import
// or call dbConnect. The caller (API Handler or Server Action) is
// responsible for establishing the connection.
// --- END DEFINITIVE FIX ---

export async function linkOpportunityToEvent(eventId, opportunityId) {
  if (
    !mongoose.Types.ObjectId.isValid(eventId) ||
    !mongoose.Types.ObjectId.isValid(opportunityId)
  ) {
    return { success: false, error: 'Invalid ID format.' }
  }
  try {
    await Promise.all([
      SynthesizedEvent.findByIdAndUpdate(eventId, {
        $addToSet: { relatedOpportunities: opportunityId },
      }),
      Opportunity.findByIdAndUpdate(opportunityId, { $addToSet: { events: eventId } }),
    ])
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
    await Promise.all([
      SynthesizedEvent.findByIdAndUpdate(eventId, {
        $pull: { relatedOpportunities: opportunityId },
      }),
      Opportunity.findByIdAndUpdate(opportunityId, { $pull: { events: eventId } }),
    ])
    return { success: true, message: 'Relationship unlinked.' }
  } catch (e) {
    return { success: false, error: 'Database operation failed.' }
  }
}
