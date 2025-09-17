// packages/data-access/src/actions/suggestions.js (version 3.0.0 - With Update)
'use server'

import { WatchlistSuggestion, WatchlistEntity, SourceSuggestion, Source } from '@headlines/models'
import { verifyAdmin } from '@headlines/auth'
import { revalidatePath } from '../revalidate.js'
import dbConnect from '../dbConnect.js'

export async function getSuggestions() {
    const { isAdmin, error } = await verifyAdmin()
    if (!isAdmin) return { success: false, error }
    try {
        await dbConnect()
        const [watchlistSuggestions, sourceSuggestions] = await Promise.all([
            WatchlistSuggestion.find({ status: 'candidate' }).sort({ createdAt: -1 }).lean(),
            SourceSuggestion.find({ status: 'pending' }).sort({ createdAt: -1 }).lean(),
        ])
        return { success: true, data: { watchlistSuggestions, sourceSuggestions } }
    } catch(e) {
        return { success: false, error: 'Failed to fetch suggestions.' }
    }
}

// DEFINITIVE FIX: Create the missing update function.
export async function updateWatchlistSuggestion(suggestionId, updateData) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };
    try {
        await dbConnect();
        const suggestion = await WatchlistSuggestion.findByIdAndUpdate(suggestionId, { $set: updateData }, { new: true }).lean();
        if (!suggestion) return { success: false, error: 'Suggestion not found.' };
        await revalidatePath('/admin/watchlist');
        return { success: true, data: JSON.parse(JSON.stringify(suggestion)) };
    } catch (e) {
        return { success: false, error: 'Failed to update suggestion.' };
    }
}

export async function processWatchlistSuggestion({ suggestionId, action }) {
    const { isAdmin, error } = await verifyAdmin()
    if (!isAdmin) return { success: false, error }
    try {
        await dbConnect()
        const suggestion = await WatchlistSuggestion.findById(suggestionId)
        if (!suggestion) return { success: false, error: 'Suggestion not found.' }
        suggestion.status = action
        await suggestion.save()

        if (action === 'approved') {
            await WatchlistEntity.updateOne({ name: suggestion.name }, {
                $setOnInsert: {
                    name: suggestion.name,
                    type: suggestion.type,
                    country: suggestion.country,
                    context: suggestion.rationale,
                    searchTerms: suggestion.searchTerms,
                    status: 'active',
                },
            }, { upsert: true });
        }
        await revalidatePath('/admin/watchlist')
        return { success: true, message: `Watchlist suggestion for "${suggestion.name}" was ${action}.` }
    } catch(e) {
        return { success: false, error: 'Failed to process suggestion.' }
    }
}

export async function processSourceSuggestion({ suggestionId, action }) {
    const { isAdmin, error } = await verifyAdmin()
    if (!isAdmin) return { success: false, error }
    try {
        await dbConnect()
        const suggestion = await SourceSuggestion.findById(suggestionId)
        if (!suggestion) return { success: false, error: 'Suggestion not found.' }
        suggestion.status = action
        await suggestion.save()

        if (action === 'approved') {
            await Source.findByIdAndUpdate(suggestion.sourceId, { $set: suggestion.suggestedSelectors });
        }
        await revalidatePath('/admin/sources')
        return { success: true, message: `Source repair suggestion for "${suggestion.sourceName}" was ${action}.` }
    } catch(e) {
        return { success: false, error: 'Failed to process suggestion.' }
    }
}
