// src/lib/wikipedia.js (Enhanced version with better search, caching, and validation)
"use server";

const WIKI_API_ENDPOINT = "https://en.wikipedia.org/w/api.php";
const WIKI_SUMMARY_LENGTH = 1200; // Slightly increased for better context
const SEARCH_LIMIT = 3; // Search multiple candidates
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache

// In-memory cache for Wikipedia results
const wikiCache = new Map();

/**
 * Cache management utilities
 */
function createWikiCacheKey(query) {
    return `wiki_${query.toLowerCase().trim().replace(/\s+/g, '_')}`;
}

function isValidCacheEntry(entry) {
    return entry && (Date.now() - entry.timestamp) < CACHE_TTL;
}

function cleanExpiredCache() {
    const now = Date.now();
    for (const [key, value] of wikiCache.entries()) {
        if (now - value.timestamp >= CACHE_TTL) {
            wikiCache.delete(key);
        }
    }
}

/**
 * Enhanced Wikipedia search with multiple strategies
 * @param {string} query - The search term
 * @returns {Promise<{success: boolean, title?: string, summary?: string, confidence?: number, error?: string}>}
 */
export async function fetchWikipediaSummary(query) {
    if (!query || query.trim().length === 0) {
        return { success: false, error: "Query cannot be empty" };
    }

    const cleanQuery = query.trim();
    const cacheKey = createWikiCacheKey(cleanQuery);
    
    // Check cache first
    if (wikiCache.has(cacheKey)) {
        const cached = wikiCache.get(cacheKey);
        if (isValidCacheEntry(cached)) {
            console.log(`[Wikipedia Cache] Hit for "${cleanQuery}"`);
            return cached.data;
        } else {
            wikiCache.delete(cacheKey);
        }
    }

    // Clean expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance
        cleanExpiredCache();
    }

    try {
        // Strategy 1: Try exact search first
        let result = await tryExactSearch(cleanQuery);
        
        // Strategy 2: If exact search fails, try fuzzy search
        if (!result.success) {
            result = await tryFuzzySearch(cleanQuery);
        }
        
        // Strategy 3: If still failing, try with common variations
        if (!result.success) {
            result = await trySearchVariations(cleanQuery);
        }

        // Cache the result (both success and failure to avoid repeated API calls)
        wikiCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;

    } catch (error) {
        console.error(`[Wikipedia Client] Unexpected error for "${cleanQuery}": ${error.message}`);
        const errorResult = { success: false, error: `Unexpected error: ${error.message}` };
        
        // Cache failures too, but with shorter TTL
        wikiCache.set(cacheKey, {
            data: errorResult,
            timestamp: Date.now() - (CACHE_TTL * 0.8) // Expire sooner for errors
        });
        
        return errorResult;
    }
}

/**
 * Try exact search using opensearch API
 */
async function tryExactSearch(query) {
    try {
        const searchParams = new URLSearchParams({
            action: "opensearch",
            search: query,
            limit: "1",
            namespace: "0",
            format: "json",
        });

        const searchResponse = await fetch(`${WIKI_API_ENDPOINT}?${searchParams.toString()}`, {
            headers: { 'User-Agent': 'RAG-Chatbot/1.0' }
        });

        if (!searchResponse.ok) {
            throw new Error(`Search API returned status ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        const pageTitle = searchData[1]?.[0];

        if (!pageTitle) {
            return { success: false, error: `No exact match found for "${query}"` };
        }

        const summary = await fetchPageSummary(pageTitle);
        if (summary.success) {
            console.log(`[Wikipedia] Exact search success for "${query}" -> "${pageTitle}"`);
            return { ...summary, confidence: 0.9 };
        }
        
        return summary;
        
    } catch (error) {
        return { success: false, error: `Exact search failed: ${error.message}` };
    }
}

/**
 * Try fuzzy search using search API
 */
async function tryFuzzySearch(query) {
    try {
        const searchParams = new URLSearchParams({
            action: "query",
            list: "search",
            srsearch: query,
            srlimit: SEARCH_LIMIT,
            srnamespace: "0",
            format: "json",
        });

        const searchResponse = await fetch(`${WIKI_API_ENDPOINT}?${searchParams.toString()}`, {
            headers: { 'User-Agent': 'RAG-Chatbot/1.0' }
        });

        if (!searchResponse.ok) {
            throw new Error(`Fuzzy search API returned status ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        const searchResults = searchData.query?.search || [];

        if (searchResults.length === 0) {
            return { success: false, error: `No fuzzy search results found for "${query}"` };
        }

        // Try the best match first
        const bestMatch = searchResults[0];
        const summary = await fetchPageSummary(bestMatch.title);
        
        if (summary.success) {
            console.log(`[Wikipedia] Fuzzy search success for "${query}" -> "${bestMatch.title}"`);
            return { 
                ...summary, 
                confidence: Math.min(0.8, bestMatch.score / 100) // Use search score for confidence
            };
        }

        return summary;
        
    } catch (error) {
        return { success: false, error: `Fuzzy search failed: ${error.message}` };
    }
}

/**
 * Try search with common variations
 */
async function trySearchVariations(query) {
    const variations = generateSearchVariations(query);
    
    for (const variation of variations) {
        const result = await tryExactSearch(variation);
        if (result.success) {
            console.log(`[Wikipedia] Variation search success for "${query}" using "${variation}"`);
            return { ...result, confidence: 0.6 };
        }
    }
    
    return { success: false, error: `No results found for "${query}" or its variations` };
}

/**
 * Generate search variations for better matching
 */
function generateSearchVariations(query) {
    const variations = [];
    
    // Remove common business suffixes
    const businessSuffixes = [' Inc', ' LLC', ' Corp', ' Company', ' Ltd', ' AG', ' GmbH'];
    let baseQuery = query;
    
    for (const suffix of businessSuffixes) {
        if (baseQuery.endsWith(suffix)) {
            baseQuery = baseQuery.slice(0, -suffix.length);
            variations.push(baseQuery);
            break;
        }
    }
    
    // Add common variations
    if (!query.toLowerCase().includes('company')) {
        variations.push(`${query} company`);
    }
    
    // Try without parenthetical information
    const withoutParens = query.replace(/\s*\([^)]*\)/g, '');
    if (withoutParens !== query) {
        variations.push(withoutParens);
    }
    
    // Try first name only for person names
    const words = query.split(' ');
    if (words.length > 1 && words[0].match(/^[A-Z][a-z]+$/)) {
        variations.push(words[0]);
    }
    
    return variations.slice(0, 3); // Limit variations
}

/**
 * Fetch summary for a specific page title
 */
async function fetchPageSummary(pageTitle) {
    try {
        const summaryParams = new URLSearchParams({
            action: "query",
            prop: "extracts|pageprops",
            exintro: "true",
            explaintext: "true",
            titles: pageTitle,
            format: "json",
            redirects: "1",
        });

        const summaryResponse = await fetch(`${WIKI_API_ENDPOINT}?${summaryParams.toString()}`, {
            headers: { 'User-Agent': 'RAG-Chatbot/1.0' }
        });

        if (!summaryResponse.ok) {
            throw new Error(`Summary API returned status ${summaryResponse.status}`);
        }

        const summaryData = await summaryResponse.json();
        const pages = summaryData.query?.pages || {};
        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (!page || page.missing) {
            return { success: false, error: `Page "${pageTitle}" does not exist` };
        }

        const extract = page.extract;
        if (!extract || extract.trim().length === 0) {
            return { success: false, error: `No summary content found for "${pageTitle}"` };
        }

        // Check if this might be a disambiguation page
        if (extract.toLowerCase().includes('may refer to:') || 
            extract.toLowerCase().includes('disambiguation')) {
            return { 
                success: false, 
                error: `"${pageTitle}" is a disambiguation page - need more specific query` 
            };
        }

        const summary = extract.length > WIKI_SUMMARY_LENGTH
            ? extract.substring(0, WIKI_SUMMARY_LENGTH) + '...'
            : extract;

        return { 
            success: true, 
            title: pageTitle, 
            summary,
            wordCount: extract.split(' ').length
        };

    } catch (error) {
        return { success: false, error: `Failed to fetch summary: ${error.message}` };
    }
}

/**
 * Batch fetch multiple Wikipedia summaries
 * @param {Array<string>} queries 
 * @returns {Promise<Array<Object>>}
 */
export async function fetchBatchWikipediaSummaries(queries) {
    if (!queries || queries.length === 0) {
        return [];
    }

    // Process with controlled concurrency to avoid overwhelming the API
    const BATCH_SIZE = 3;
    const results = [];

    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
        const batch = queries.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(query => 
            fetchWikipediaSummary(query).catch(error => ({
                success: false,
                error: error.message,
                query
            }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to be respectful to Wikipedia API
        if (i + BATCH_SIZE < queries.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log(`[Wikipedia Batch] Processed ${queries.length} queries, ${results.filter(r => r.success).length} successful`);
    return results;
}

/**
 * Get cache statistics
 * @returns {Promise<Object>}
 */
export async function getWikipediaCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of wikiCache.entries()) {
        if (now - value.timestamp < CACHE_TTL) {
            validEntries++;
        } else {
            expiredEntries++;
        }
    }

    return {
        totalEntries: wikiCache.size,
        validEntries,
        expiredEntries,
        cacheHitRate: validEntries / (validEntries + expiredEntries) || 0
    };
}

/**
 * Validate Wikipedia content quality
 * @param {string} summary 
 * @returns {Promise<Object>}
 */
export async function validateWikipediaContent(summary) {
    if (!summary) {
        return { valid: false, reason: 'Empty summary' };
    }

    const wordCount = summary.split(' ').length;
    if (wordCount < 10) {
        return { valid: false, reason: 'Summary too short' };
    }

    // Check for common Wikipedia stub indicators
    const stubIndicators = [
        'this article is a stub',
        'you can help wikipedia',
        'this biography of a living person',
        'citation needed'
    ];

    const hasStubIndicators = stubIndicators.some(indicator => 
        summary.toLowerCase().includes(indicator)
    );

    if (hasStubIndicators) {
        return { valid: false, reason: 'Stub or low-quality article' };
    }

    return { valid: true, wordCount, quality: wordCount > 100 ? 'high' : 'medium' };
}