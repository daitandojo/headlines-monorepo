// apps/pipeline/scripts/seed/lib/synthetic-article-builder.js
import mongoose from 'mongoose'

/**
 * Creates a synthetic article object from a prepared rich list individual and a specific event chunk.
 * @param {object} person - A prepared individual object from the data loader.
 * @param {object} eventChunk - An event chunk from the AI event chunker.
 * @returns {object} A synthetic article object.
 */
export function createSyntheticArticle(person, eventChunk) {
  const headline = `Event Profile: ${eventChunk.type} involving ${eventChunk.participants.join(', ')}`
  // Combine the specific event description with the general background for rich context
  const content = `An analysis of a specific wealth event involving ${person.name}.
Event Type: ${eventChunk.type}
Event Date: ${eventChunk.date}
Event Description: ${eventChunk.description}

General Background Context:
${person.background}
${person.wealthSummary || ''}`

  // Create a unique link based on the person and a hash of the event description
  const eventHash = new mongoose.Types.ObjectId().toString().slice(-6)
  const link = `https://richlist.norway/${person.name.toLowerCase().replace(/\s+/g, '-')}-${eventChunk.date}-${eventHash}`

  return {
    _id: new mongoose.Types.ObjectId(),
    headline,
    link,
    newspaper: `Kapital Rich List ${person.year}`,
    source: 'Richlist Ingestion',
    country: person.country,
    createdAt: new Date(eventChunk.date),
    articleContent: { contents: [content] },
    relevance_headline: 100,
    status: 'scraped',
  }
}
