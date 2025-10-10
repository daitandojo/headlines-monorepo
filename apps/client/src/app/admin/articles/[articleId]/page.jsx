// sourcePack.txt updated in apps/client/src/app/admin/articles/[articleId]/page.jsx

'use server'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import ArticleEditor from './ArticleEditor'

export default async function ArticleDetailPage({ params }) {
  const { articleId } = params

  try {
    // ✅ Fetch through API route
    const url = new URL(
      `/api/admin/articles/${articleId}`,
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    )

    const response = await fetch(url.toString(), {
      headers: {
        cookie: cookies().toString(), // Forward cookies for auth
      },
    })

    if (!response.ok) {
      notFound()
    }

    const result = await response.json()

    // The handler for this route returns data directly, not nested in a 'data' object.
    if (!result) {
      notFound()
    }

    return <ArticleEditor initialArticle={JSON.parse(JSON.stringify(result))} />
  } catch (err) {
    console.error('[ArticleDetailPage] Failed to fetch article:', err.message)
    notFound()
  }
}
