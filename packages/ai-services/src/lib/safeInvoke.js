// packages/ai-services/src/lib/safeInvoke.js
import { logger } from '@headlines/utils-shared'
import { getRedisClient } from '@headlines/utils-server/node'
import { createHash } from 'crypto'

const MAX_RETRIES = 1
const CACHE_TTL_SECONDS = 60 * 60 * 24
const inMemoryCache = new Map()

function createCacheKey(agentName, input) {
  const hash = createHash('sha256')
  hash.update(JSON.stringify(input))
  return `ai_cache:${agentName}:${hash.digest('hex')}`
}

export async function safeInvoke(chain, input, agentName, zodSchema) {
  const redis = await getRedisClient()
  const cacheKey = createCacheKey(agentName, input)

  if (redis) {
    try {
      const cachedResult = await redis.get(cacheKey)
      if (typeof cachedResult === 'string' && cachedResult.length > 0) {
        logger.trace({ agent: agentName }, `[Redis Cache HIT] for ${agentName}.`)
        return JSON.parse(cachedResult)
      }
    } catch (err) {
      logger.error({ err, agent: agentName, key: cacheKey }, `Redis GET or PARSE failed.`)
    }
  } else if (inMemoryCache.has(cacheKey)) {
    logger.trace({ agent: agentName }, `[In-Memory Cache HIT] for ${agentName}.`)
    return inMemoryCache.get(cacheKey)
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let result = await chain.invoke(input)

      // --- START OF DEFINITIVE, FINAL FIX ---
      // The old logic relied on LangChain's strict JsonOutputParser. This new logic is more robust.
      // 1. Unwrap the AIMessage object to get the raw string content.
      if (result && typeof result.content === 'string' && result.id) {
        result = result.content
      }

      if (typeof result !== 'string') {
        throw new Error('AI response was not a string after unwrapping.')
      }

      // 2. Use a regex to find the JSON block, ignoring any conversational text from the AI.
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No valid JSON object found in the LLM's string response.")
      }

      // 3. Parse only the extracted JSON block.
      const parsedResult = JSON.parse(jsonMatch[0])
      // --- END OF DEFINITIVE, FINAL FIX ---

      const validation = zodSchema.safeParse(parsedResult)
      if (!validation.success) {
        logger.error(
          {
            agent: agentName,
            zodErrorSummary: validation.error.flatten(),
            rawAIDataThatFailedValidation: parsedResult,
          },
          `Zod validation failed for ${agentName}.`
        )
        throw new Error('Zod validation failed')
      }

      const dataToCache = validation.data

      if (redis) {
        try {
          await redis.set(cacheKey, JSON.stringify(dataToCache), {
            EX: CACHE_TTL_SECONDS,
          })
        } catch (err) {
          logger.error({ err, agent: agentName }, `Redis SET failed for ${agentName}.`)
        }
      } else {
        inMemoryCache.set(cacheKey, dataToCache)
      }
      return dataToCache
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        logger.warn(
          { agent: agentName, attempt: attempt + 1, error: error.message },
          `Invocation failed for ${agentName}. Retrying...`
        )
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)))
        continue
      }
      logger.error(
        { err: error, agent: agentName },
        `Chain invocation failed for ${agentName} after all retries.`
      )
      return { error: `Agent ${agentName} failed: ${error.message}` }
    }
  }
}
