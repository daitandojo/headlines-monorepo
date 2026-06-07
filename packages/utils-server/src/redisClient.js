// packages/utils-server/src/redisClient.js
import { logger } from '@headlines/utils-shared' // CORRECTED IMPORT PATH
import { Redis } from '@upstash/redis'

let redisClient
let connectionState = 'idle'

export async function getRedisClient(env) {
  if (connectionState === 'ready' && redisClient) {
    return redisClient
  }
  if (connectionState === 'failed' || connectionState === 'connecting') {
    return null
  }
  if (connectionState === 'idle') {
    if (!env || !env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      logger.warn(
        'UPSTASH_REDIS_REST_URL and/or TOKEN not found in provided env. Caching will be disabled.'
      )
      connectionState = 'failed'
      return null
    }
    try {
      connectionState = 'connecting'
      const client = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
      })
      await client.ping()
      logger.info('✅ Upstash Redis client connected successfully.')
      connectionState = 'ready'
      redisClient = client
      return client
    } catch (err) {
      logger.error({ err: err.message }, 'Upstash Redis connection failed.')
      connectionState = 'failed'
      return null
    }
  }
}

export async function testRedisConnection(env) {
  if (!env || !env.UPSTASH_REDIS_REST_URL) {
    logger.warn('Redis is not configured. Caching will be disabled.')
    return true
  }
  try {
    const client = await getRedisClient(env)
    if (client) {
      // Retry the SET/GET test once to handle transient Upstash consistency issues
      const maxAttempts = 2
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const testKey = `test:${Date.now()}:${attempt}`
          await client.set(testKey, 'test-value', { ex: 10 })
          const testValue = await client.get(testKey)
          await client.del(testKey)
          if (testValue === 'test-value') {
            logger.info('✅ Redis connection and read/write test successful.')
            return true
          }
          // Log what we got back for diagnosis
          logger.warn(
            {
              attempt,
              expected: 'test-value',
              receivedType: typeof testValue,
              received: typeof testValue === 'string' ? testValue.substring(0, 50) : JSON.stringify(testValue),
            },
            `Redis read/write test mismatch (attempt ${attempt}/${maxAttempts})`
          )
          if (attempt < maxAttempts) {
            // Wait 500ms before retry — allows Upstash consistency to settle
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch (attemptErr) {
          logger.warn(
            { attempt, err: attemptErr.message },
            `Redis read/write test threw (attempt ${attempt}/${maxAttempts})`
          )
          if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        }
      }
      // All attempts failed — abort pipeline
      return false
    }
    return true
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis pre-flight check failed.')
    return true
  }
}
