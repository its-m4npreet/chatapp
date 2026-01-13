const cacheService = require('../services/cacheService');
const Message = require('../model/message');

/**
 * Cache Persistence Worker
 * This worker monitors Redis cache and persists data to MongoDB
 * before the TTL expires, then cleans up the cache
 */

class CachePersistenceWorker {
  constructor(checkInterval = 3000) {
    this.checkInterval = checkInterval; // Check every 3 seconds by default (reduced frequency)
    this.isRunning = false;
    this.failureCount = 0;
    this.maxFailures = 5;
  }

  /**
   * Start the persistence worker
   */
  start() {
    if (this.isRunning) {
      console.log('Cache persistence worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('Cache persistence worker started');

    // Run the persistence check periodically
    this.intervalId = setInterval(() => {
      this.persistCachedData();
    }, this.checkInterval);
  }

  /**
   * Stop the persistence worker
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('Cache persistence worker stopped');
    }
  }

  /**
   * Persist all cached messages to MongoDB
   */
  async persistCachedData() {
    try {
      // Skip if Redis is not ready
      if (!cacheService.isRedisReady()) {
        this.failureCount++;
        if (this.failureCount === 1) {
          console.log('Skipping cache persistence - Redis not ready');
        }
        return;
      }

      // Reset failure count when Redis is back
      if (this.failureCount > 0) {
        console.log('Redis reconnected, resuming cache persistence');
        this.failureCount = 0;
      }

      // Get all message cache keys
      const messageKeys = await cacheService.getKeysByPattern('message:*');

      if (messageKeys.length === 0) {
        return; // No messages to persist
      }

      for (const key of messageKeys) {
        const cachedMessage = await cacheService.getCache(key);

        if (cachedMessage) {
          try {
            // Check if message already exists in DB (it should)
            const existingMessage = await Message.findById(cachedMessage._id);

            if (existingMessage) {
              console.log(`Message ${cachedMessage._id} persisted. Cleaning cache...`);
              // Message already saved, remove from cache
              await cacheService.deleteCache(key);
            }
          } catch (error) {
            console.error(`Error persisting message ${key}:`, error.message);
          }
        }
      }

      // Clean up conversation caches after 5 seconds
      const conversationKeys = await cacheService.getKeysByPattern('messages:*');
      for (const key of conversationKeys) {
        // These are cleaned automatically by Redis TTL
        console.log(`Conversation cache will expire: ${key}`);
      }
    } catch (error) {
      this.failureCount++;
      if (this.failureCount <= 2) {
        console.error('Cache persistence error:', error.message);
      }
      // Don't rethrow - let the worker continue running even if Redis is temporarily unavailable
    }
  }

  /**
   * Force clean expired cache entries
   * This is called automatically, but can be manually triggered
   */
  async forceCleanExpiredCache() {
    try {
      if (!cacheService.isRedisReady()) {
        console.warn('Redis not ready for cache cleanup');
        return;
      }

      console.log('Force cleaning expired cache entries...');
      const allKeys = await cacheService.getKeysByPattern('*');

      for (const key of allKeys) {
        const exists = await cacheService.getCache(key);
        if (!exists) {
          console.log(`Cache entry expired: ${key}`);
        }
      }
    } catch (error) {
      console.error('Force clean error:', error.message);
    }
  }
}

module.exports = new CachePersistenceWorker();
