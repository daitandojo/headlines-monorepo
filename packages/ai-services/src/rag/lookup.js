// packages/ai-services/src/rag/lookup.js
// RAG-based lookup to find existing opportunities by name
import { Pinecone } from "@pinecone-database/pinecone";
import { generateQueryEmbeddings } from "../embeddings/embeddings.js";
import { env } from "@headlines/config";
import { logger } from "@headlines/utils-shared";

let pineconeIndex = null;

function initializePinecone() {
  if (!pineconeIndex && env.PINECONE_API_KEY) {
    const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    pineconeIndex = pc.index(env.PINECONE_INDEX_NAME);
  }
}

export async function findExistingOpportunityByName(name) {
  initializePinecone();

  if (!pineconeIndex) {
    logger.debug("[RAG Lookup] Pinecone not configured");
    return null;
  }

  try {
    const embeddings = await generateQueryEmbeddings(name);
    const embedding = embeddings[0]; // Use first variation

    const response = await pineconeIndex.query({
      topK: 3,
      vector: embedding,
      includeMetadata: true,
      filter: { type: "opportunity" },
    });

    const matches = response.matches || [];

    for (const match of matches) {
      if (match.score >= 0.75) {
        const meta = match.metadata || {};
        logger.info(
          `[RAG Lookup] Found existing opportunity: ${meta.name} (score: ${match.score.toFixed(2)})`,
        );
        return {
          id: match.id,
          name: meta.name,
          score: match.score,
          metadata: meta,
        };
      }
    }

    logger.debug(`[RAG Lookup] No existing opportunity found for "${name}"`);
    return null;
  } catch (error) {
    logger.error(
      { err: error, name },
      "[RAG Lookup] Failed to search Pinecone",
    );
    return null;
  }
}

export async function findExistingByNameOrCreate(name, options = {}) {
  const { role, company, location } = options;

  const existing = await findExistingOpportunityByName(name);

  if (existing) {
    return { exists: true, ...existing };
  }

  logger.info(`[RAG Lookup] New person "${name}" - will create as opportunity`);
  return { exists: false, name };
}
