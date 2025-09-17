// packages/data-access/src/actions/adminArticles.js (version 1.0.0)
'use server'

import dbConnect from '../dbConnect.js';
import { Article } from '@headlines/models';
import { buildQuery } from '../queryBuilder.js';
import { verifyAdmin } from '@headlines/auth';
import { revalidatePath } from '../revalidate.js';

// DEFINITIVE FIX: Removed the hardcoded page limit.
export async function getAdminArticles({ page = 1, filters = {}, sort = 'date_desc' }) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error, data: [], total: 0 };
    
    await dbConnect();
    const { queryFilter, sortOptions } = await buildQuery(Article, { filters, sort, baseQuery: {} });
    
    // Pagination is now fully handled by the client-side DataTable component.
    const [articles, total] = await Promise.all([
        Article.find(queryFilter).sort(sortOptions).lean(),
        Article.countDocuments(queryFilter)
    ]);

    return { success: true, data: JSON.parse(JSON.stringify(articles)), total };
}

export async function updateAdminArticle(articleId, updateData) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };
    try {
        await dbConnect();
        const article = await Article.findByIdAndUpdate(articleId, { $set: updateData }, { new: true }).lean();
        if (!article) return { success: false, error: 'Article not found.' };
        await revalidatePath('/admin/articles');
        return { success: true, data: JSON.parse(JSON.stringify(article)) };
    } catch (e) {
        return { success: false, error: 'Failed to update article.' };
    }
}

export async function deleteAdminArticle(articleId) {
    const { isAdmin, error } = await verifyAdmin();
    if (!isAdmin) return { success: false, error };
    try {
        await dbConnect();
        const result = await Article.findByIdAndDelete(articleId);
        if (!result) return { success: false, error: 'Article not found.' };
        await revalidatePath('/admin/articles');
        return { success: true };
    } catch (e) {
        return { success: false, error: 'Failed to delete article.' };
    }
}
