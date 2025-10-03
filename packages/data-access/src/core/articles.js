// packages/data-access/src/core/articles.js
import { Article } from '@headlines/models'
import { buildQuery } from '../queryBuilder.js'
import mongoose from 'mongoose'

const ARTICLES_PER_PAGE = 50

export async function getArticles({
  page = 1,
  filters = {},
  sort = 'date_desc',
  userId = null,
}) {
  const { queryFilter, sortOptions } = await buildQuery(Article, {
    filters,
    sort,
    userId,
  })

  const [articles, total] = await Promise.all([
    Article.find(queryFilter)
      .sort(sortOptions)
      .skip((page - 1) * ARTICLES_PER_PAGE)
      .limit(ARTICLES_PER_PAGE)
      .lean(),
    Article.countDocuments(queryFilter),
  ])

  return { success: true, data: JSON.parse(JSON.stringify(articles)), total }
}

export async function findArticles({
  filter = {},
  sort = { createdAt: -1 },
  select = '',
  limit = 0,
}) {
  try {
    const query = Article.find(filter).sort(sort).select(select)
    if (limit > 0) {
      query.limit(limit)
    }
    const articles = await query.lean()
    return { success: true, data: JSON.parse(JSON.stringify(articles)) }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updateArticles(filter, update) {
  try {
    const result = await Article.updateMany(filter, update)
    return {
      success: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getTotalArticleCount({ filters = {}, userId = null }) {
  const { queryFilter } = await buildQuery(Article, { filters, userId })
  const total = await Article.countDocuments(queryFilter)
  return { success: true, total }
}

export async function updateArticle(articleId, updateData) {
  const article = await Article.findByIdAndUpdate(
    articleId,
    { $set: updateData },
    { new: true }
  ).lean()
  if (!article) return { success: false, error: 'Article not found.' }
  return { success: true, data: JSON.parse(JSON.stringify(article)) }
}

export async function deleteArticle(articleId) {
  const result = await Article.findByIdAndDelete(articleId)
  if (!result) return { success: false, error: 'Article not found.' }
  return { success: true }
}

export async function getArticleDetails(articleId) {
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    return { success: false, error: 'Invalid ID format.' }
  }
  const article = await Article.findById(articleId).lean()
  if (!article) {
    return { success: false, error: 'Article not found.' }
  }
  return { success: true, data: JSON.parse(JSON.stringify(article)) }
}
