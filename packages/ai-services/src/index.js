// packages/ai-services/src/index.js
// This is the default, Node.js-safe entry point. It exports everything.

// --- SHARED EXPORTS ---
export * from './lib/langchain.js'
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

// --- NODE-ONLY EXPORTS ---
export * from './node/agents/articleAgent.js'
export * from './node/agents/articlePreAssessmentAgent.js'
export * from './node/agents/batchArticleAgent.js'
export * from './node/agents/clusteringAgent.js'
export * from './node/agents/headlineAgent.js'
export * from './node/agents/judgeAgent.js'
export * from './node/agents/sectionClassifierAgent.js'
export * from './node/agents/selectorRepairAgent.js'
export * from './node/agents/watchlistAgent.js'

// --- MOVED LOGIC FROM DATA-ACCESS ---
import { logger } from '@headlines/utils-shared'
import { settings } from '@headlines/config/node'
import { callLanguageModel } from './lib/langchain.js'
import { SynthesizedEvent, Opportunity } from '@headlines/models/node'
import { synthesizeEvent } from './shared/agents/synthesisAgent.js'
import { generateOpportunitiesFromEvent } from './shared/agents/opportunityAgent.js'
import { instructionSourceDiscovery } from '@headlines/prompts'
import { generateEmbedding } from './embeddings/embeddings.js'
import { Article } from '@headlines/models'
import mongoose from 'mongoose'

const TITLE_GENERATOR_PROMPT = `You are a title generation AI. Your task is to read a conversation and create a concise, 5-word-or-less title that accurately summarizes the main topic. Example Title: "Anders Holch Povlsen's Bestseller"`

export async function generateChatTitle(messages) {
  if (!messages || messages.length < 2) {
    return { success: false, error: 'Not enough messages to generate a title.' }
  }
  try {
    const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n')
    const title = await callLanguageModel({
      modelName: settings.LLM_MODEL_UTILITY,
      systemPrompt: TITLE_GENERATOR_PROMPT,
      userContent: conversationText,
      isJson: false,
    })
    const cleanedTitle = title.trim().replace(/"/g, '')
    return { success: true, title: cleanedTitle }
  } catch (error) {
    return { success: false, error: 'Failed to generate title.' }
  }
}

export async function processUploadedArticle(item, userId) {
  if (!userId) {
    return { success: false, error: 'Authentication required' }
  }
  try {
    const enrichedArticle = {
      ...item,
      relevance_article: 100,
      assessment_article: item.article,
      articleContent: { contents: [item.article] },
      newspaper: 'Manual Upload',
      country: ['Denmark'],
      key_individuals: [],
    }

    const synthesizedResult = await synthesizeEvent([enrichedArticle], [], '', '')
    if (
      !synthesizedResult ||
      !synthesizedResult.events ||
      synthesizedResult.events.length === 0
    ) {
      throw new Error('AI failed to synthesize an event from the provided text.')
    }
    const eventData = synthesizedResult.events[0]

    const eventToSave = new SynthesizedEvent({
      ...eventData,
      event_key: `manual-${new Date().toISOString()}`,
      highest_relevance_score: 100,
      source_articles: [
        { headline: item.headline, link: '#manual', newspaper: 'Manual Upload' },
      ],
    })

    const opportunitiesToSave = await generateOpportunitiesFromEvent(eventToSave, [
      enrichedArticle,
    ])

    await eventToSave.save()
    if (opportunitiesToSave.length > 0) {
      await Opportunity.insertMany(
        opportunitiesToSave.map((opp) => ({ ...opp, events: [eventToSave._id] }))
      )
    }

    return { success: true, event: eventToSave.synthesized_headline }
  } catch (e) {
    console.error('[Upload Action Error]:', e)
    return { success: false, error: e.message }
  }
}

export async function addKnowledge(data) {
  const { headline, business_summary, source, country, link } = data
  if (!headline || !business_summary || !source || !country || !link) {
    return { success: false, message: 'All fields are required.' }
  }
  try {
    const textToEmbed = `${headline}\n${business_summary}`
    const embedding = await generateEmbedding(textToEmbed)
    const newArticle = new Article({
      _id: new mongoose.Types.ObjectId(),
      headline,
      link,
      newspaper: source,
      source: 'Manual Upload',
      country: [country],
      relevance_headline: 100,
      assessment_headline: 'Manually uploaded by user.',
      relevance_article: 100,
      assessment_article: business_summary,
      embedding: embedding,
      key_individuals: [],
    })
    await newArticle.save()
    // Pinecone logic would go here
    return { success: true, message: 'Knowledge successfully added and embedded.' }
  } catch (error) {
    console.error('[Add Knowledge Error]', error)
    return { success: false, message: 'Failed to add knowledge.' }
  }
}

export async function suggestSections(url) {
  const scrapeResult = { success: true, content: '<div>Mock Content</div>' }
  try {
    const data = await callLanguageModel({
      modelName: settings.LLM_MODEL_UTILITY,
      systemPrompt: instructionSourceDiscovery,
      userContent: `Analyze the HTML from ${url}:\n\n${scrapeResult.content}`,
      isJson: true,
    })
    return { success: true, data: data.suggestions }
  } catch (e) {
    return { success: false, error: 'AI agent failed to suggest sections.' }
  }
}

// --- Sanity Check Function ---
export async function performAiSanityCheck() {
  try {
    logger.info('🔬 Performing AI service sanity check (OpenAI)...')
    const answer = await callLanguageModel({
      modelName: 'gpt-3.5-turbo', // Use a standard, widely available model for the check
      prompt: 'In one word, what is the capital of France?',
      isJson: false,
    })

    // Handle API call failure from safeExecute
    if (answer && answer.error) {
      logger.fatal(
        { details: answer.error },
        'OpenAI sanity check failed. The API call failed or timed out. This is often due to an incorrect API key, network issues, or service outage.'
      )
      return false
    }

    // Handle unexpected response format
    if (
      !answer ||
      typeof answer !== 'string' ||
      !answer.trim().toLowerCase().includes('paris')
    ) {
      logger.fatal(
        { details: { expected: 'paris', received: answer } },
        `OpenAI sanity check failed. The model did not return the expected response.`
      )
      return false
    }

    logger.info('✅ AI service sanity check passed.')
    return true
  } catch (error) {
    // This will catch any unexpected synchronous errors in the function itself.
    logger.fatal(
      { err: error },
      'OpenAI sanity check failed with an unexpected exception.'
    )
    return false
  }
}
