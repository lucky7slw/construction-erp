import { Redis } from 'ioredis';

let redis: Redis;

const createRedisClient = (): Redis => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return new Redis(redisUrl, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      return err.message.includes(targetError);
    },
  });
};

// Use global variable in development to avoid multiple Redis instances
declare global {
  var __redis: Redis | undefined;
}

if (process.env.NODE_ENV === 'production') {
  redis = createRedisClient();
} else {
  if (!global.__redis) {
    global.__redis = createRedisClient();
  }
  redis = global.__redis;
}

// Event handlers
redis.on('connect', () => {
  console.log('Redis client connected');
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

redis.on('error', (err) => {
  console.error('Redis client error:', err);
});

redis.on('close', () => {
  console.log('Redis client connection closed');
});

redis.on('reconnecting', () => {
  console.log('Redis client reconnecting...');
});

// Graceful shutdown
process.on('beforeExit', async () => {
  try {
    await redis.quit();
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
});

process.on('SIGINT', async () => {
  try {
    await redis.quit();
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  try {
    await redis.quit();
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
  process.exit(0);
});

export { redis };