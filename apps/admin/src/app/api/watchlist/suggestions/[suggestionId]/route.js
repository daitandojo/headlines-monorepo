// apps/admin/src/app/api/watchlist/suggestions/[suggestionId]/route.js (version 1.0.0)
'use server'

import { NextResponse } from 'next/server';
import { updateWatchlistSuggestion } from '@headlines/data-access';
import { verifyAdmin } from '@headlines/auth';
import { initializeSharedLogic } from '@/lib/init-shared-logic.js';
import mongoose from 'mongoose';

export async function PATCH(request, { params }) {
    await initializeSharedLogic();
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return NextResponse.json({ error }, { status: 401 });

    const { suggestionId } = params;
    if (!mongoose.Types.ObjectId.isValid(suggestionId)) {
        return NextResponse.json({ error: 'Invalid suggestion ID' }, { status: 400 });
    }

    const updateData = await request.json();
    const result = await updateWatchlistSuggestion(suggestionId, updateData);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result);
}
