'use server'

import { logger } from '@headlines/utils-server/node'
import { getRedisClient } from '@headlines/utils-server/node'
import { createHash } from 'crypto'
import { StringOutputParser } from '@langchain/core/output_parsers'

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
      const stringParser = new StringOutputParser()
      const stringResult = await chain.pipe(stringParser).invoke(input)

      // --- START OF THE FIX ---
      // Check if the AI returned a valid string before trying to parse it.
      if (typeof stringResult !== 'string' || stringResult.trim() === '') {
        throw new Error('LLM returned an empty or non-string response.')
      }
      // --- END OF THE FIX ---

      const jsonMatch = stringResult.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No valid JSON object found in the LLM's string response.")
      }
      const result = JSON.parse(jsonMatch[0])

      const validation = zodSchema.safeParse(result)
      if (!validation.success) {
        logger.error(
          { details: validation.error.flatten(), agent: agentName, output: result },
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
