// packages/utils-server/src/redisClient.ts
import { Redis } from '@upstash/redis';
import { logger } from '@shared/utils';
let redisClient = null;
export function getRedisClient(env = process.env) {
    if (redisClient)
        return redisClient;
    const url = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
        logger.warn('⚠️ [Redis] UPSTASH_REDIS_REST_URL or TOKEN not set. Caching disabled.');
        return null;
    }
    try {
        redisClient = new Redis({ url, token });
        return redisClient;
    }
    catch (error) {
        logger.error('❌ [Redis] Failed to initialize client:', error.message);
        return null;
    }
}
//# sourceMappingURL=redisClient.js.map