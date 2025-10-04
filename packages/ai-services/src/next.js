// packages/ai-services/src/next.js
import 'server-only'

export * from './chains/index.js'
export * from './search/search.js'
export * from './search/wikipedia.js'
export * from './embeddings/embeddings.js'
export * from './embeddings/vectorSearch.js'
export * from './rag/orchestrator.js'
export * from './shared/agents/synthesisAgent.js'
export * from './shared/agents/opportunityAgent.js'
export * from './shared/agents/contactAgent.js'
export * from './shared/agents/entityAgent.js'
export * from './shared/agents/emailAgents.js'
export * from './shared/agents/executiveSummaryAgent.js'

import {
  generateChatTitle as coreGenTitle,
  processUploadedArticle as coreUpload,
  addKnowledge as coreAddKnowledge,
  suggestSections as coreSuggestSections,
} from './index.js'
import dbConnect from '@headlines/data-access/dbConnect/next'
import { revalidatePath } from 'next/cache'

// Wrap core functions with dbConnect for the Next.js environment
export const generateChatTitle = async (...args) => {
  await dbConnect()
  return coreGenTitle(...args)
}

export const processUploadedArticle = async (...args) => {
  await dbConnect()
  const result = await coreUpload(...args)
  if (result.success) {
    revalidatePath('/events')
    revalidatePath('/opportunities')
  }
  return result
}

export const addKnowledge = async (...args) => {
  await dbConnect()
  return coreAddKnowledge(...args)
}

export const suggestSections = async (...args) => {
  await dbConnect()
  return coreSuggestSections(...args)
}

import { performAiSanityCheck as coreSanityCheck } from './index.js'
export const performAiSanityCheck = coreSanityCheck
