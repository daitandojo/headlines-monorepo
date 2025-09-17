// apps/pipeline/src/utils/redisClient.js (HTTP Alternative Version)
import { logger } from '@headlines/utils/src/server.js';
import { env } from '@headlines/config/src/server.js';

let httpRedisClient;
let connectionState = 'idle';

// HTTP-based Redis client using fetch (works everywhere)
class HttpRedisClient {
  constructor(url, token) {
    this.baseUrl = url;
    this.token = token;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async request(command, ...args) {
    const body = [command, ...args];
    
    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (err) {
      logger.error({ err: err.message, command, args }, 'Redis HTTP request failed');
      throw err;
    }
  }

  // Common Redis commands
  async ping() {
    return await this.request('PING');
  }

  async get(key) {
    return await this.request('GET', key);
  }

  async set(key, value, options = {}) {
    const args = [key, value];
    if (options.EX) args.push('EX', options.EX);
    if (options.PX) args.push('PX', options.PX);
    if (options.NX) args.push('NX');
    if (options.XX) args.push('XX');
    return await this.request('SET', ...args);
  }

  async del(...keys) {
    return await this.request('DEL', ...keys);
  }

  async exists(...keys) {
    return await this.request('EXISTS', ...keys);
  }

  async incr(key) {
    return await this.request('INCR', key);
  }

  async expire(key, seconds) {
    return await this.request('EXPIRE', key, seconds);
  }

  async ttl(key) {
    return await this.request('TTL', key);
  }

  async hget(key, field) {
    return await this.request('HGET', key, field);
  }

  async hset(key, ...fieldValues) {
    return await this.request('HSET', key, ...fieldValues);
  }

  async hgetall(key) {
    return await this.request('HGETALL', key);
  }

  async hdel(key, ...fields) {
    return await this.request('HDEL', key, ...fields);
  }

  async lpush(key, ...values) {
    return await this.request('LPUSH', key, ...values);
  }

  async rpush(key, ...values) {
    return await this.request('RPUSH', key, ...values);
  }

  async lpop(key) {
    return await this.request('LPOP', key);
  }

  async rpop(key) {
    return await this.request('RPOP', key);
  }

  async llen(key) {
    return await this.request('LLEN', key);
  }

  // Utility methods to match redis client interface
  get isOpen() {
    return true; // HTTP client is always "open"
  }

  async disconnect() {
    // No persistent connection to close
    return 'OK';
  }

  async quit() {
    return this.disconnect();
  }
}

export async function getRedisClient() {
  if (connectionState === 'ready' && httpRedisClient) {
    return httpRedisClient;
  }
  
  if (connectionState === 'failed' || connectionState === 'connecting') {
    return null;
  }
  
  if (connectionState === 'idle') {
    // First, try to get HTTP credentials
    const restUrl = env.UPSTASH_REDIS_REST_URL;
    const restToken = env.UPSTASH_REDIS_REST_TOKEN;
    
    if (restUrl && restToken) {
      logger.info('Using Upstash Redis HTTP REST API...');
      connectionState = 'connecting';
      
      try {
        const client = new HttpRedisClient(restUrl, restToken);
        
        // Test the connection
        const pingResult = await client.ping();
        if (pingResult === 'PONG') {
          logger.info('✅ Redis HTTP client connected and ping test successful.');
          connectionState = 'ready';
          httpRedisClient = client;
          return httpRedisClient;
        } else {
          throw new Error(`Unexpected ping response: ${pingResult}`);
        }
        
      } catch (err) {
        logger.error({ err: err.message }, 'Redis HTTP connection failed.');
        connectionState = 'failed';
        return null;
      }
    }
    
    // Fallback: Try TCP connection if HTTP not configured
    if (!env.REDIS_URL) {
      logger.warn('Neither REDIS_URL nor Upstash HTTP credentials found. Caching will be disabled.');
      connectionState = 'failed';
      return null;
    }

    logger.info('HTTP Redis not configured, attempting TCP connection...');
    
    try {
      // Import Redis dynamically to avoid issues if not needed
      const { createClient } = await import('redis');
      
      connectionState = 'connecting';
      const client = createClient({
        url: env.REDIS_URL,
        socket: {
          connectTimeout: 15000,
          tls: { rejectUnauthorized: false }
        }
      });

      client.on('error', (err) => {
        logger.error({ err: err.message }, 'Redis TCP client error');
        connectionState = 'failed';
      });

      await client.connect();
      await client.ping();
      
      logger.info('✅ Redis TCP client connected successfully.');
      connectionState = 'ready';
      httpRedisClient = client;
      return client;
      
    } catch (err) {
      logger.error({ err: err.message }, 'Both HTTP and TCP Redis connections failed.');
      connectionState = 'failed';
      return null;
    }
  }
}

export async function testRedisConnection() {
  if (!env.UPSTASH_REDIS_REST_URL && !env.REDIS_URL) {
    logger.warn('Redis is not configured. Caching will be disabled.');
    return true;
  }

  try {
    const client = await getRedisClient();
    
    if (client) {
      // Test basic operations
      const testKey = `test:${Date.now()}`;
      await client.set(testKey, 'test-value', { EX: 10 });
      const testValue = await client.get(testKey);
      await client.del(testKey);
      
      if (testValue === 'test-value') {
        logger.info('✅ Redis connection and read/write test successful.');
        return true;
      } else {
        logger.warn('Redis connected but read/write test failed.');
        return true;
      }
    } else {
      logger.warn('Redis client not available. Pipeline will continue with caching disabled.');
      return true;
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis pre-flight check failed. Pipeline will continue with caching disabled.');
    return true;
  }
}

export async function closeRedisClient() {
  if (httpRedisClient) {
    try {
      await httpRedisClient.disconnect();
      logger.info('Redis client connection closed gracefully.');
    } catch (err) {
      logger.warn({ err: err.message }, 'Error closing Redis client.');
    } finally {
      httpRedisClient = null;
      connectionState = 'idle';
    }
  }
}