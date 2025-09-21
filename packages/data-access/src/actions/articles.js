// packages/data-access/src/actions/articles.js (version 3.0.0 - Unified)
'use server'

import dbConnect from '../dbConnect.js'
import { Article } from '../../../models/src/index.js'
import { buildQuery } from '../queryBuilder.js'
import { revalidatePath } from '../revalidate.js'

const ARTICLES_PER_PAGE = 50 // Admin views can show more

export async function getArticles({
  page = 1,
  filters = {},
  sort = 'date_desc',
  userId = null,
}) {
  await dbConnect()
  // If no userId is passed, it's an admin request and won't apply user-specific filters.
  const { queryFilter, sortOptions } = await buildQuery(Article, {
    filters,
    sort,
    userId,
  })
  const skipAmount = (page - 1) * ARTICLES_PER_PAGE

  const [articles, total] = await Promise.all([
    Article.find(queryFilter)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(ARTICLES_PER_PAGE)
      .lean(),
    Article.countDocuments(queryFilter),
  ])

  return { success: true, data: JSON.parse(JSON.stringify(articles)), total }
}

export async function updateArticle(articleId, updateData) {
  await dbConnect()
  const article = await Article.findByIdAndUpdate(
    articleId,
    { $set: updateData },
    { new: true }
  ).lean()
  if (!article) return { success: false, error: 'Article not found.' }
  await revalidatePath('/admin/articles')
  return { success: true, data: JSON.parse(JSON.stringify(article)) }
}

export async function deleteArticle(articleId) {
  await dbConnect()
  const result = await Article.findByIdAndDelete(articleId)
  if (!result) return { success: false, error: 'Article not found.' }
  await revalidatePath('/admin/articles')
  return { success: true }
}
