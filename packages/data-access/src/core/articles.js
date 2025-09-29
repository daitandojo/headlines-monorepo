'use server'

import { Article } from '@headlines/models'
import { buildQuery } from '../queryBuilder.js'
import dbConnect from '@headlines/data-access/dbConnect/node' // Make sure this is imported
import mongoose from 'mongoose'

const ARTICLES_PER_PAGE = 50

export async function getArticles({
  page = 1,
  filters = {},
  sort = 'date_desc',
  userId = null,
}) {
  await dbConnect() // <-- ADD THIS BACK
  let { queryFilter, sortOptions } = await buildQuery(Article, {
    filters,
    sort,
    userId,
  })
  // ... rest of the function is the same
  const [articles, total] = await Promise.all([
    Article.find(queryFilter)
      .sort(sortOptions)
      .skip((page - 1) * ARTICLES_PER_PAGE)
      .limit(ARTICLES_PER_PAGE)
      .lean(),
    Article.countDocuments(queryFilter),
  ])
  // ...
  return { success: true, data: JSON.parse(JSON.stringify(articles)), total }
}

export async function getTotalArticleCount({ filters = {}, userId = null }) {
  await dbConnect() // <-- ADD THIS BACK
  const { queryFilter } = await buildQuery(Article, { filters, userId })
  const total = await Article.countDocuments(queryFilter)
  return { success: true, total }
}

export async function updateArticle(articleId, updateData) {
  await dbConnect() // <-- ADD THIS BACK
  const article = await Article.findByIdAndUpdate(
    articleId,
    { $set: updateData },
    { new: true }
  ).lean()
  if (!article) return { success: false, error: 'Article not found.' }
  return { success: true, data: JSON.parse(JSON.stringify(article)) }
}

export async function deleteArticle(articleId) {
  await dbConnect() // <-- ADD THIS BACK
  const result = await Article.findByIdAndDelete(articleId)
  if (!result) return { success: false, error: 'Article not found.' }
  return { success: true }
}

export async function getArticleDetails(articleId) {
  await dbConnect() // <-- ADD THIS BACK
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    return { success: false, error: 'Invalid ID format.' }
  }
  const article = await Article.findById(articleId).lean()
  if (!article) {
    return { success: false, error: 'Article not found.' }
  }
  return { success: true, data: JSON.parse(JSON.stringify(article)) }
}
