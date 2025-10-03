// src/lib/embeddings.js (Enhanced version with query expansion and caching)

// In-memory cache for embeddings (consider Redis for production)
const embeddingCache = new Map();
const MAX_CACHE_SIZE = 1000;

// Singleton pattern to ensure we only load the model once per server instance
class EmbeddingPipeline {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;
    
    static async getInstance() {
        if (this.instance === null) {
            const { pipeline } = await import('@xenova/transformers');
            this.instance = await pipeline(this.task, this.model);
        }
        return this.instance;
    }
}

/**
 * Creates a cache key from text
 * @param {string} text 
 * @returns {string}
 */
function createCacheKey(text) {
    return `embed_${text.toLowerCase().trim().replace(/\s+/g, '_')}`;
}

/**
 * Manages cache size to prevent memory bloat
 */
function manageCacheSize() {
    if (embeddingCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest 20% of entries (FIFO-ish)
        const keysToRemove = Array.from(embeddingCache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
        keysToRemove.forEach(key => embeddingCache.delete(key));
        console.log(`[Embedding Cache] Cleaned ${keysToRemove.length} entries`);
    }
}

/**
 * Generates an embedding for a given text with caching
 * @param {string} text The text to embed
 * @returns {Promise<Array<number>>} A promise that resolves to the embedding vector
 */
export async function generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty for embedding generation');
    }
    
    const cleanText = text.trim();
    const cacheKey = createCacheKey(cleanText);
    
    // Check cache first
    if (embeddingCache.has(cacheKey)) {
        console.log(`[Embedding Cache] Hit for text: "${cleanText.substring(0, 50)}..."`);
        return embeddingCache.get(cacheKey);
    }
    
    try {
        const extractor = await EmbeddingPipeline.getInstance();
        const output = await extractor(cleanText, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);
        
        // Cache the result
        manageCacheSize();
        embeddingCache.set(cacheKey, embedding);
        
        console.log(`[Embedding] Generated embedding for text: "${cleanText.substring(0, 50)}..." (${embedding.length} dimensions)`);
        return embedding;
        
    } catch (error) {
        console.error(`[Embedding Error] Failed to generate embedding: ${error.message}`);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * Generates multiple query variations to improve RAG recall
 * @param {string} originalQuery 
 * @returns {Promise<Array<Array<number>>>} Array of embeddings for different query variations
 */
export async function generateQueryEmbeddings(originalQuery) {
    const variations = generateQueryVariations(originalQuery);
    const embeddingPromises = variations.map(query => generateEmbedding(query));
    
    try {
        const embeddings = await Promise.all(embeddingPromises);
        console.log(`[Query Expansion] Generated ${embeddings.length} query variations for: "${originalQuery}" ->`, variations);
        return embeddings;
    } catch (error) {
        console.error(`[Query Expansion Error] ${error.message}`);
        // Fallback to original query only
        return [await generateEmbedding(originalQuery)];
    }
}

/**
 * Creates query variations to improve semantic search recall
 * @param {string} query 
 * @returns {Array<string>}
 */
function generateQueryVariations(query) {
    const originalQuery = query.trim();
    const variations = new Set([originalQuery]);

    // CORRECTED: Smartly strip disambiguation tags for broader searches
    const coreEntity = originalQuery.replace(/\s*\((company|person)\)$/, '').trim();
    if (coreEntity !== originalQuery) {
        variations.add(coreEntity);
    }

    // Pattern for "Who founded X?"
    const हूंFounderMatch = coreEntity.toLowerCase().match(/^(?:who|what)\s+(?:is|was|founded|created)\s+(.+)/);
    if ( हूंFounderMatch) {
        let subject = हूंFounderMatch[1].replace(/\?/g, '').replace(/^(the|a|an)\s/,'').trim();
        variations.add(subject);
        variations.add(`${subject} founder`);
        variations.add(`founder of ${subject}`);
        variations.add(`${subject} history`);
    } else {
        // General question pattern
        const questionMatch = coreEntity.toLowerCase().match(/^(who|what|when|where|why|how)\s(is|are|was|were|did|does|do)\s(.+)/);
        if (questionMatch) {
            let subject = questionMatch[3].replace(/\?/g, '').trim();
            variations.add(subject);
            
            const simplified = subject.replace(/^(the|a|an)\s/,'').split(' of ');
            if (simplified.length > 1) {
                variations.add(`${simplified[1].trim()} ${simplified[0].trim()}`);
            }
        }
    }
    
    // Add generic variations for the core entity
    if (hasProperNouns(coreEntity)) {
        variations.add(`${coreEntity} background details`);
        variations.add(`Information about ${coreEntity}`);
    }
    
    // Return the top 4 most distinct variations
    return Array.from(variations).slice(0, 4);
}


/**
 * Simple check for proper nouns (capitalized words not at the start of a sentence)
 * @param {string} text 
 * @returns {boolean}
 */
function hasProperNouns(text) {
    // Looks for words starting with an uppercase letter
    return /\b[A-Z][a-z]+/.test(text);
}

/**
 * Batch embedding generation for efficiency
 * @param {Array<string>} texts 
 * @returns {Promise<Array<Array<number>>>}
 */
export async function generateBatchEmbeddings(texts) {
    if (!texts || texts.length === 0) {
        return [];
    }
    
    const embeddings = [];
    const extractor = await EmbeddingPipeline.getInstance();
    
    // Process in batches to avoid memory issues
    const BATCH_SIZE = 10;
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(text => {
            const cacheKey = createCacheKey(text);
            if (embeddingCache.has(cacheKey)) {
                return Promise.resolve(embeddingCache.get(cacheKey));
            }
            return extractor(text, { pooling: 'mean', normalize: true })
                .then(output => {
                    const embedding = Array.from(output.data);
                    embeddingCache.set(cacheKey, embedding);
                    return embedding;
                });
        });
        
        const batchEmbeddings = await Promise.all(batchPromises);
        embeddings.push(...batchEmbeddings);
        
        console.log(`[Batch Embedding] Processed batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(texts.length/BATCH_SIZE)}`);
    }
    
    return embeddings;
}

/**
 * Calculate cosine similarity between two embeddings
 * @param {Array<number>} embedding1 
 * @param {Array<number>} embedding2 
 * @returns {Promise<number>} Similarity score between 0 and 1
 */
export async function calculateSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
        throw new Error('Embeddings must have the same dimensions');
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Get cache statistics for monitoring
 * @returns {Promise<Object>}
 */
export async function getCacheStats() {
    return {
        size: embeddingCache.size,
        maxSize: MAX_CACHE_SIZE,
        utilizationPercent: Math.round((embeddingCache.size / MAX_CACHE_SIZE) * 100)
    };
}