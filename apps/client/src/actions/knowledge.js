// src/actions/knowledge.js (version 2.0)
'use server'

import { revalidatePath } from 'next/cache'
import { Pinecone } from '@pinecone-database/pinecone'
import mongoose from 'mongoose'
import dbConnect from '@/lib/mongodb'
import Article from '@/models/Article'
import { generateEmbedding } from '@/lib/embeddings'
import { env } from '@/lib/env.mjs' // <-- Import the validated env object

let pineconeIndex
function getPineconeIndex() {
  if (!pineconeIndex) {
    const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY })
    pineconeIndex = pc.index(env.PINECONE_INDEX_NAME)
  }
  return pineconeIndex
}

export async function addKnowledge(data) {
  const { headline, business_summary, source, country, link } = data
  console.log(`[Add Knowledge] Attempting to add new knowledge: "${headline}"`)

  if (!headline || !business_summary || !source || !country || !link) {
    console.error('[Add Knowledge] Validation failed: Missing required fields.')
    return { success: false, message: 'All fields are required.' }
  }

  try {
    const index = getPineconeIndex()
    await dbConnect()
    console.log('[Add Knowledge] Database connected.')

    console.log('[Add Knowledge] Generating embedding...')
    const textToEmbed = `${headline}\n${business_summary}`
    const embedding = await generateEmbedding(textToEmbed)
    console.log('[Add Knowledge] Embedding generated successfully.')

    const newArticle = new Article({
      _id: new mongoose.Types.ObjectId(),
      headline,
      link,
      newspaper: source,
      source: 'Manual Upload',
      country,
      relevance_headline: 100,
      assessment_headline: 'Manually uploaded by user.',
      relevance_article: 100,
      assessment_article: business_summary,
      embedding: embedding,
      // For simplicity, we assume key individuals might be extracted by another process
      // or we can leave it empty for manual uploads. Here, we'll ensure it's an empty array.
      key_individuals: [],
    })
    console.log('[Add Knowledge] MongoDB document created.')

    await newArticle.save()
    console.log('[Add Knowledge] Saved to MongoDB.')

    // Extract names for Pinecone metadata
    const key_individual_names = (newArticle.key_individuals || []).map((p) => p.name)

    await index.upsert([
      {
        id: newArticle._id.toString(),
        values: embedding,
        metadata: {
          headline: newArticle.headline,
          summary: newArticle.assessment_article,
          newspaper: newArticle.newspaper,
          country: newArticle.country,
          key_individuals: key_individual_names,
        },
      },
    ])
    console.log('[Add Knowledge] Upserted to Pinecone.')

    revalidatePath('/articles')
    revalidatePath('/events')
    console.log('[Add Knowledge] Revalidated paths.')

    return { success: true, message: 'Knowledge successfully added and embedded.' }
  } catch (error) {
    console.error('[Add Knowledge Error]', error)
    return { success: false, message: 'Failed to add knowledge.' }
  }
}
