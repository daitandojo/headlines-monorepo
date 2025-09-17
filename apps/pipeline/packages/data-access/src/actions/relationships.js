// packages/data-access/src/actions/relationships.js (version 1.0)
'use server'

import { verifyAdmin } from '@headlines/auth';
import { SynthesizedEvent, Opportunity } from '@headlines/models';
import dbConnect from '../dbConnect.js';
import { revalidatePath } from '../revalidate.js';
import mongoose from 'mongoose';

async function linkOpportunityToEvent(eventId, opportunityId) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(opportunityId)) {
        return { success: false, error: 'Invalid ID format.' };
    }

    try {
        await dbConnect();
        await Promise.all([
            SynthesizedEvent.findByIdAndUpdate(eventId, { $addToSet: { relatedOpportunities: opportunityId } }),
            Opportunity.findByIdAndUpdate(opportunityId, { $addToSet: { events: eventId } })
        ]);
        revalidatePath('/admin/events');
        revalidatePath('/admin/opportunities');
        return { success: true, message: 'Relationship linked.' };
    } catch (e) {
        return { success: false, error: 'Database operation failed.' };
    }
}

async function unlinkOpportunityFromEvent(eventId, opportunityId) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(opportunityId)) {
        return { success: false, error: 'Invalid ID format.' };
    }

    try {
        await dbConnect();
        await Promise.all([
            SynthesizedEvent.findByIdAndUpdate(eventId, { $pull: { relatedOpportunities: opportunityId } }),
            Opportunity.findByIdAndUpdate(opportunityId, { $pull: { events: eventId } })
        ]);
        revalidatePath('/admin/events');
        revalidatePath('/admin/opportunities');
        return { success: true, message: 'Relationship unlinked.' };
    } catch (e) {
        return { success: false, error: 'Database operation failed.' };
    }
}

export { linkOpportunityToEvent, unlinkOpportunityFromEvent };
