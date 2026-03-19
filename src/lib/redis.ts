import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379'

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    reconnectOnError(err) {
      const targetError = 'READONLY'
      if (err.message.includes(targetError)) {
        return true
      }
      return false
    },
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message)
  })

  client.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Redis] Connected')
    }
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

// ============================================================
// Cache helpers
// ============================================================

const DEFAULT_TTL = 300 // 5 minutes

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = DEFAULT_TTL,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // Cache failures are non-fatal
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Cache failures are non-fatal
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Cache failures are non-fatal
  }
}

export function buildCacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}

export default redis
