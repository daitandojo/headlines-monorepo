// packages/data-access/src/actions/adminEvents.js (version 1.0.1 - Resilient)
'use server'

import dbConnect from '../dbConnect.js';
import { SynthesizedEvent, Article, Opportunity } from '@headlines/models';
import { buildQuery } from '../queryBuilder.js';
import { verifyAdmin } from '@headlines/auth';
import { revalidatePath } from '../revalidate.js';
import mongoose from 'mongoose';

const EVENTS_PER_PAGE = 50;

export async function getAdminEvents({ page = 1, filters = {}, sort = 'createdAt_desc' }) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error, data: [], total: 0 };
    
    try {
        await dbConnect();
        
        const { queryFilter, sortOptions } = await buildQuery(SynthesizedEvent, { 
            filters, 
            sort, 
            baseQuery: {} 
        });
        
        const skipAmount = (page - 1) * EVENTS_PER_PAGE;

        const [events, total] = await Promise.all([
            SynthesizedEvent.find(queryFilter)
                .select('-synthesized_summary')
                .sort(sortOptions)
                .skip(skipAmount)
                .limit(EVENTS_PER_PAGE)
                .lean(),
            SynthesizedEvent.countDocuments(queryFilter)
        ]);

        return { 
            success: true, 
            data: JSON.parse(JSON.stringify(events)), 
            total 
        };
    } catch (e) {
        console.error('getAdminEvents error:', e);
        return { 
            success: false, 
            error: 'Failed to fetch events', 
            data: [], 
            total: 0 
        };
    }
}

export async function getAdminEventDetails(eventId) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };

    try {
        await dbConnect();
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return { success: false, error: 'Invalid event ID' };
        }
        
        const event = await SynthesizedEvent.findById(eventId)
            .populate({ 
                path: 'relatedOpportunities', 
                model: Opportunity, 
                select: 'reachOutTo likelyMMDollarWealth' 
            })
            .lean();

        if (!event) return { success: false, error: 'Event not found' };

        const articleLinks = event.source_articles?.map(a => a.link) || [];
        const articles = articleLinks.length > 0 
            ? await Article.find({ link: { $in: articleLinks } })
                .select('headline link newspaper')
                .lean()
            : [];

        event.source_articles_full = articles;
        return { success: true, data: JSON.parse(JSON.stringify(event)) };
    } catch (e) {
        console.error('getAdminEventDetails error:', e);
        return { success: false, error: 'Failed to fetch event details.' };
    }
}

export async function updateAdminEvent(eventId, updateData) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };
    
    try {
        await dbConnect();
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return { success: false, error: 'Invalid event ID' };
        }
        
        const event = await SynthesizedEvent.findByIdAndUpdate(
            eventId, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        ).lean();
        
        if (!event) return { success: false, error: 'Event not found.' };
        
        await revalidatePath('/admin/events');
        return { success: true, data: JSON.parse(JSON.stringify(event)) };
    } catch (e) {
        console.error('updateAdminEvent error:', e);
        return { success: false, error: 'Failed to update event.' };
    }
}

export async function deleteAdminEvent(eventId) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };
    
    try {
        await dbConnect();
        
        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return { success: false, error: 'Invalid event ID' };
        }
        
        const result = await SynthesizedEvent.findByIdAndDelete(eventId);
        if (!result) return { success: false, error: 'Event not found.' };
        
        await Promise.all([
            Opportunity.updateMany(
                { events: eventId }, 
                { $pull: { events: eventId } }
            ),
            Article.updateMany(
                { synthesizedEventId: eventId }, 
                { $unset: { synthesizedEventId: '' } }
            )
        ]);
        
        await revalidatePath('/admin/events');
        return { success: true };
    } catch (e) {
        console.error('deleteAdminEvent error:', e);
        return { success: false, error: 'Failed to delete event.' };
    }
}
