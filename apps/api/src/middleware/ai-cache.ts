import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { redis } from '../lib/redis';
import { CacheError } from '../types/ai';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
  excludeHeaders?: string[];
  customKeyGenerator?: (request: FastifyRequest) => string;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(
  request: FastifyRequest,
  options: CacheOptions
): string {
  if (options.customKeyGenerator) {
    return options.customKeyGenerator(request);
  }

  const prefix = options.keyPrefix || 'ai_cache';
  const url = request.url;
  const method = request.method;
  const body = request.body || {};
  const userId = (request as any).user?.id || 'anonymous';

  // Create hash from method, URL, body, and user
  const content = JSON.stringify({
    method,
    url,
    body,
    userId,
  });

  const hash = createHash('sha256').update(content).digest('hex');
  return `${prefix}:${hash}`;
}

/**
 * AI Cache middleware for caching AI responses
 */
export function createAICacheMiddleware(options: CacheOptions = {}) {
  const defaultTTL = options.ttl || 3600; // 1 hour default

  return async function aiCacheMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const cacheKey = generateCacheKey(request, options);

      // Try to get cached response
      const cachedResponse = await redis.get(cacheKey);
      if (cachedResponse) {
        const parsed = JSON.parse(cachedResponse);

        // Add cache headers
        reply.headers({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': await redis.ttl(cacheKey)
        });

        return reply.send(parsed);
      }

      // Store original send method
      const originalSend = reply.send.bind(reply);

      // Override send method to cache response
      reply.send = function(payload: any) {
        // Only cache successful responses
        if (reply.statusCode >= 200 && reply.statusCode < 300) {
          // Cache the response asynchronously
          setImmediate(async () => {
            try {
              await redis.setex(
                cacheKey,
                defaultTTL,
                JSON.stringify(payload)
              );
            } catch (error) {
              request.log.warn({ error, cacheKey }, 'Failed to cache AI response');
            }
          });
        }

        // Add cache miss headers
        reply.headers({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        });

        return originalSend(payload);
      };

    } catch (error) {
      // Don't fail the request if caching fails
      request.log.warn({ error }, 'AI cache middleware error');
    }
  };
}

/**
 * Invalidate cache entries by pattern
 */
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }

    await redis.del(...keys);
    return keys.length;
  } catch (error) {
    throw new CacheError('Failed to invalidate cache', { pattern, error });
  }
}

/**
 * Invalidate user-specific cache
 */
export async function invalidateUserCache(userId: string): Promise<number> {
  const pattern = `ai_cache:*${userId}*`;
  return invalidateCache(pattern);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  memoryUsage: string;
  hitRate?: number;
}> {
  try {
    const info = await redis.info('memory');
    const keyCount = await redis.dbsize();

    // Parse memory usage from info
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

    return {
      totalKeys: keyCount,
      memoryUsage,
    };
  } catch (error) {
    throw new CacheError('Failed to get cache stats', { error });
  }
}

/**
 * Clear all AI cache
 */
export async function clearAICache(): Promise<number> {
  return invalidateCache('ai_cache:*');
}

/**
 * Preload cache with common AI responses
 */
export async function preloadCache(entries: Array<{
  key: string;
  data: any;
  ttl?: number;
}>): Promise<void> {
  try {
    const pipeline = redis.pipeline();

    for (const entry of entries) {
      const ttl = entry.ttl || 3600;
      pipeline.setex(
        `ai_cache:${entry.key}`,
        ttl,
        JSON.stringify(entry.data)
      );
    }

    await pipeline.exec();
  } catch (error) {
    throw new CacheError('Failed to preload cache', { error });
  }
}

/**
 * Cache warming for expensive AI operations
 */
export class CacheWarmer {
  private static instance: CacheWarmer;
  private warmupTasks: Map<string, () => Promise<void>> = new Map();

  static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  registerWarmupTask(key: string, task: () => Promise<void>): void {
    this.warmupTasks.set(key, task);
  }

  async warmup(key?: string): Promise<void> {
    if (key) {
      const task = this.warmupTasks.get(key);
      if (task) {
        await task();
      }
    } else {
      // Warm up all registered tasks
      await Promise.all(
        Array.from(this.warmupTasks.values()).map(task => task())
      );
    }
  }
}