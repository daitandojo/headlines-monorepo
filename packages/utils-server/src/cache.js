// packages/utils-server/src/cache.js
import { getRedisClient } from "./redisClient.js";
import { env } from "@headlines/config";
import { logger } from "@headlines/utils-shared";

const DEFAULT_TTL = 300; // 5 minutes

let redisClient = null;

async function getClient() {
  if (!redisClient) {
    redisClient = await getRedisClient(env);
  }
  return redisClient;
}

export async function getCached(key, fallback) {
  try {
    const client = await getClient();
    if (!client) {
      return await fallback();
    }

    const cached = await client.get(key);
    if (cached) {
      logger.debug({ key }, "Cache hit");
      return typeof cached === "string" ? JSON.parse(cached) : cached;
    }

    logger.debug({ key }, "Cache miss");
    const data = await fallback();

    if (data !== undefined && data !== null) {
      await client.set(key, JSON.stringify(data), { ex: DEFAULT_TTL });
    }

    return data;
  } catch (error) {
    logger.error({ err: error, key }, "Cache error, falling back");
    return await fallback();
  }
}

export async function setCache(key, data, ttl = DEFAULT_TTL) {
  try {
    const client = await getClient();
    if (client && data !== undefined) {
      await client.set(key, JSON.stringify(data), { ex: ttl });
    }
  } catch (error) {
    logger.error({ err: error, key }, "Failed to set cache");
  }
}

export async function invalidateCache(pattern) {
  try {
    const client = await getClient();
    if (!client) return;

    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      logger.info({ pattern, count: keys.length }, "Cache invalidated");
    }
  } catch (error) {
    logger.error({ err: error, pattern }, "Failed to invalidate cache");
  }
}

// Helper for caching country lists
export async function getCachedCountries(fallback) {
  return getCached("countries:all", fallback);
}

// Helper for caching source lists
export async function getCachedSources(fallback) {
  return getCached("sources:active", fallback);
}

// Helper for caching user preferences
export function getUserCacheKey(userId, prefix) {
  return `user:${userId}:${prefix}`;
}
