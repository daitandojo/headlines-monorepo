// src/actions/articles.js (version 4.1)
'use server'

import dbConnect from '@/lib/mongodb'
import Article from '@/models/Article'
import { revalidatePath } from 'next/cache'
import { ARTICLES_PER_PAGE } from '@/config/constants'
import { buildQuery } from '@/lib/queryBuilder'

export async function deleteArticle(articleId) {
  if (!articleId) {
    return { success: false, message: 'Article ID is required.' }
  }

  try {
    await dbConnect()
    const result = await Article.findByIdAndDelete(articleId)

    if (!result) {
      return { success: false, message: 'Article not found.' }
    }

    revalidatePath('/')
    return { success: true, message: 'Article deleted successfully.' }
  } catch (error) {
    console.error('Delete Article Error:', error)
    return { success: false, message: 'Failed to delete article.' }
  }
}

const baseQuery = {
  $or: [{ relevance_article: { $gt: 25 } }, { relevance_headline: { $gt: 25 } }],
}

export async function getArticles({ page = 1, filters = {}, sort = 'date_desc' }) {
  await dbConnect()
  const { queryFilter, sortOptions } = buildQuery(Article, { filters, sort, baseQuery })
  const skipAmount = (page - 1) * ARTICLES_PER_PAGE

  const articles = await Article.find(queryFilter)
    .sort(sortOptions)
    .skip(skipAmount)
    .limit(ARTICLES_PER_PAGE)
    .lean()

  return JSON.parse(JSON.stringify(articles))
}

export async function getTotalArticleCount({ filters = {} } = {}) {
  await dbConnect()
  const { queryFilter } = buildQuery(Article, { filters, baseQuery })
  const count = await Article.countDocuments(queryFilter)
  return count
}
