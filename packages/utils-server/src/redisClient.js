import { logger } from './logger.js'
import { env } from '@headlines/config/server'
import { Redis } from '@upstash/redis'
let redisClient
let connectionState = 'idle'
export async function getRedisClient() {
  if (connectionState === 'ready' && redisClient) {
    return redisClient
  }
  if (connectionState === 'failed' || connectionState === 'connecting') {
    return null
  }
  if (connectionState === 'idle') {
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      logger.warn(
        'UPSTASH_REDIS_REST_URL and/or TOKEN not found. Caching will be disabled.'
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
export async function testRedisConnection() {
  if (!env.UPSTASH_REDIS_REST_URL) {
    logger.warn('Redis is not configured. Caching will be disabled.')
    return true
  }
  try {
    const client = await getRedisClient()
    if (client) {
      const testKey = `test:${Date.now()}`
      await client.set(testKey, 'test-value', { ex: 10 })
      const testValue = await client.get(testKey)
      await client.del(testKey)
      if (testValue === 'test-value') {
        logger.info('✅ Redis connection and read/write test successful.')
        return true
      }
      return false
    }
    return true
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis pre-flight check failed.')
    return true
  }
}
