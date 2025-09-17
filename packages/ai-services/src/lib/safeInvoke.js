// packages/ai-services/src/lib/safeInvoke.js (version 3.2.0)
import { logger } from '../../../utils/src/server.js'
import { createHash } from 'crypto'
import { env } from '../../../config/src/server.js'

// This dynamic import approach allows the package to be used in different contexts
// without a hard dependency on the pipeline's internal structure.
let getRedisClient
try {
  ;({ getRedisClient } = await import(
    '../../../../apps/pipeline/src/utils/redisClient.js'
  ))
} catch (e) {
  // DEFINITIVE FIX: Add a smarter warning that checks if Redis was configured.
  if (env.UPSTASH_REDIS_REST_URL || env.REDIS_URL) {
    logger.error(
      { err: e },
      'CRITICAL: Redis is configured in the environment, but the client module failed to import. Caching will be degraded to in-memory only.'
    )
  } else {
    logger.info('Redis is not configured. Using in-memory cache as a fallback.')
  }
  getRedisClient = async () => null
}

const MAX_RETRIES = 1
const CACHE_TTL_SECONDS = 60 * 60 * 24 // 24 hours

// --- In-Memory Cache Fallback ---
const inMemoryCache = new Map()

function createCacheKey(agentName, input) {
  const hash = createHash('sha256')
  hash.update(JSON.stringify(input))
  return `ai_cache:${agentName}:${hash.digest('hex')}`
}

export async function safeInvoke(chain, input, agentName, zodSchema) {
  const redis = await getRedisClient()
  const cacheKey = createCacheKey(agentName, input)

  // --- Cache GET ---
  if (redis) {
    try {
      const cachedResult = await redis.get(cacheKey)
      if (cachedResult) {
        logger.trace({ agent: agentName }, `[Redis Cache HIT] for ${agentName}.`)
        return JSON.parse(cachedResult)
      }
    } catch (err) {
      logger.error({ err, agent: agentName }, `Redis GET failed for ${agentName}.`)
    }
  } else if (inMemoryCache.has(cacheKey)) {
    logger.trace({ agent: agentName }, `[In-Memory Cache HIT] for ${agentName}.`)
    return inMemoryCache.get(cacheKey)
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await chain.invoke(input)
      const validation = zodSchema.safeParse(result)
      if (!validation.success) {
        logger.error(
          {
            details: validation.error.flatten(),
            agent: agentName,
            input,
            output: result,
          },
          `Zod validation failed for ${agentName}.`
        )
        throw new Error('Zod validation failed')
      }

      const dataToCache = validation.data

      // --- Cache SET ---
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
      if (
        (error.message.includes('JSON') ||
          error.message.includes('Zod validation failed')) &&
        attempt < MAX_RETRIES
      ) {
        logger.warn(
          { agent: agentName, attempt: attempt + 1 },
          `LLM output validation failed for ${agentName}. Retrying...`
        )
        continue
      }
      logger.error(
        { err: error, agent: agentName },
        `LangChain invocation failed for ${agentName}.`
      )
      return { error: `Agent ${agentName} failed: ${error.message}` }
    }
  }
}
