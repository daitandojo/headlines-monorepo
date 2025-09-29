'use server'

import { getArticleDetails } from '@headlines/data-access'
import { notFound } from 'next/navigation'
import ArticleEditor from './ArticleEditor' // We will create this next

export default async function ArticleDetailPage({ params }) {
  const { articleId } = params
  const result = await getArticleDetails(articleId)

  if (!result.success || !result.data) {
    notFound()
  }

  return <ArticleEditor initialArticle={JSON.parse(JSON.stringify(result.data))} />
}
