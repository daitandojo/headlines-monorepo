// apps/client/src/app/api/vector-search/route.js
import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { SynthesizedEvent, Opportunity, Article } from '@headlines/models/next'
import { Pinecone } from '@pinecone-database/pinecone'
import { env } from '@headlines/config/next'

const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY })
const pineconeIndex = pc.index(env.PINECONE_INDEX_NAME)

const handlePost = async (request) => {
  const { itemId, itemType } = await request.json()

  if (!itemId || !itemType) {
    return NextResponse.json(
      { error: 'itemId and itemType are required.' },
      { status: 400 }
    )
  }

  const modelMap = {
    event: SynthesizedEvent,
    opportunity: Opportunity,
    article: Article,
  }
  const Model = modelMap[itemType]
  if (!Model) {
    return NextResponse.json({ error: 'Invalid itemType.' }, { status: 400 })
  }

  // 1. Fetch the original item to get its embedding
  const originalItem = await Model.findById(itemId).select('embedding').lean()
  if (!originalItem || !originalItem.embedding || originalItem.embedding.length === 0) {
    return NextResponse.json(
      { error: 'Original item not found or has no embedding.' },
      { status: 404 }
    )
  }

  // 2. Query Pinecone for similar vectors
  const queryResponse = await pineconeIndex.query({
    topK: 6, // Fetch 6 to exclude the item itself
    vector: originalItem.embedding,
    // Optional: Filter by the same type for more relevant results
    filter: { type: { $eq: itemType } },
    includeMetadata: false, // We only need the IDs
  })

  // 3. Extract IDs, excluding the original item's ID
  const similarIds = queryResponse.matches
    .map((match) => match.id.replace(`${itemType}_`, ''))
    .filter((id) => id !== itemId)
    .slice(0, 5) // Ensure we only have 5 results

  if (similarIds.length === 0) {
    return NextResponse.json({ data: [] })
  }

  // 4. Fetch the full documents for the similar IDs from MongoDB
  const similarItems = await Model.find({ _id: { $in: similarIds } }).lean()

  // 5. Add the item type to each result for the frontend
  const typedItems = similarItems.map((item) => ({ ...item, _type: itemType }))

  return NextResponse.json({ data: typedItems })
}

export const POST = createApiHandler(handleGet)
export const dynamic = 'force-dynamic'
