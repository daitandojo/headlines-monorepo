// packages/data-access/src/actions/articles.js (version 2.1.0)
'use server'

import dbConnect from '../dbConnect.js'
import { Article, Subscriber } from '../../../models/src/index.js'
import { revalidatePath } from '../revalidate.js'
import { buildQuery } from '../queryBuilder.js'
import { getUserIdFromSession } from '../../../auth/src/index.js'

const ARTICLES_PER_PAGE = 10;

export async function deleteArticle({ itemId, userId }) {
  if (!itemId || !userId) {
    return { success: false, message: 'Article ID and user ID are required.' }
  }
  try {
    await dbConnect()
    // Soft-delete by adding to the user's discarded list.
    await Subscriber.updateOne({ _id: userId }, { $addToSet: { 'discardedItems.articles': itemId } });
    await revalidatePath('/')
    return { success: true, message: 'Article discarded successfully.' }
  } catch (error) {
    return { success: false, message: 'Failed to discard article.' }
  }
}

const baseQuery = {
  $or: [{ relevance_article: { $gt: 25 } }, { relevance_headline: { $gt: 25 } }],
}

export async function getArticles({ page = 1, filters = {}, sort = 'date_desc', userId: explicitUserId = null }) {
  const sessionUserId = await getUserIdFromSession();
  const userId = explicitUserId || sessionUserId;
  await dbConnect()
  const { queryFilter, sortOptions } = await buildQuery(Article, { filters, sort, baseQuery, userId })
  const skipAmount = (page - 1) * ARTICLES_PER_PAGE

  const articles = await Article.find(queryFilter)
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(ARTICLES_PER_PAGE)
    .lean()

  return JSON.parse(JSON.stringify(articles))
}

export async function getTotalArticleCount({ filters = {}, userId: explicitUserId = null } = {}) {
  const sessionUserId = await getUserIdFromSession();
  const userId = explicitUserId || sessionUserId;
  await dbConnect()
  const { queryFilter } = await buildQuery(Article, { filters, baseQuery, userId })
  const count = await Article.countDocuments(queryFilter)
  return count
}
