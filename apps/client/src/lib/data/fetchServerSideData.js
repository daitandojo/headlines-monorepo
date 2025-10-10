// apps/client/src/lib/data/fetchServerSideData.js
'use server'

import { cookies } from 'next/headers'

/**
 * A reusable helper for fetching data within Server Components from internal API routes.
 * It automatically forwards cookies for authentication and handles basic error cases.
 * @param {string} path - The internal API path (e.g., '/api/events').
 * @param {object} params - An object of query parameters to add to the URL.
 * @returns {Promise<{data: Array, total: number}>} The fetched data and total count, or empty defaults on error.
 */
export async function fetchServerSideData(path, params = {}) {
  try {
    const url = new URL(path, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })

    const response = await fetch(url.toString(), {
      headers: { cookie: cookies().toString() },
      // Optional: Add caching strategy if needed
      // next: { revalidate: 60 } // e.g., revalidate every 60 seconds
    })

    if (!response.ok) {
      console.error(
        `[fetchServerSideData] API Error for ${path}:`,
        response.status,
        await response.text()
      )
      return { data: [], total: 0 }
    }

    const result = await response.json()
    return { data: result.data || [], total: result.total || 0 }
  } catch (err) {
    console.error(
      `[fetchServerSideData] Network or parsing error for ${path}:`,
      err.message
    )
    return { data: [], total: 0 }
  }
}
