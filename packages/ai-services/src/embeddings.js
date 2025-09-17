// packages/ai-services/src/embeddings.js (version 2.0)
'use server'

import { pipeline } from '@xenova/transformers'

// Use a singleton pattern to ensure we only load the model once per server instance.
class EmbeddingPipeline {
  static task = 'feature-extraction'
  static model = 'Xenova/all-MiniLM-L6-v2' // Correct 384-dimension model
  static instance = null

  static async getInstance() {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model)
    }
    return this.instance
  }
}

/**
 * Generates an embedding for a given text using the local transformer model.
 * @param {string} text The text to embed.
 * @returns {Promise<Array<number>>} A promise that resolves to the embedding vector.
 */
export async function generateEmbedding(text) {
  const extractor = await EmbeddingPipeline.getInstance()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  // The output tensor needs to be converted to a standard array.
  return Array.from(output.data)
}
