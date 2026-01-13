const redisClient = require('../config/redis');

class CacheService {
  constructor(cacheTTL = 5) {
    this.cacheTTL = cacheTTL; // TTL in seconds (default 5 seconds)
    this.lastErrorTime = 0;
    this.errorSuppression = 2000; // Suppress similar errors for 2 seconds
  }

  /**
   * Check if Redis connection is ready
   */
  isRedisReady() {
    return redisClient.isReady && redisClient.isReady();
  }

  /**
   * Check if we should suppress error logging
   */
  shouldLogError() {
    const now = Date.now();
    if (now - this.lastErrorTime > this.errorSuppression) {
      this.lastErrorTime = now;
      return true;
    }
    return false;
  }

  /**
   * Set data in cache with TTL
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
   */
  async setCache(key, data, ttl = this.cacheTTL) {
    if (!this.isRedisReady()) {
      return;
    }
    try {
      const serialized = JSON.stringify(data);
      await redisClient.setEx(key, ttl, serialized);
      console.log(`Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Cache set error:', error.message);
      }
    }
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {object|null} Cached data or null if not found
   */
  async getCache(key) {
    if (!this.isRedisReady()) {
      return null;
    }
    try {
      const data = await redisClient.get(key);
      if (data) {
        console.log(`Cache hit: ${key}`);
        return JSON.parse(data);
      }
      console.log(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Cache get error:', error.message);
      }
      return null;
    }
  }

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   */
  async deleteCache(key) {
    if (!this.isRedisReady()) {
      return;
    }
    try {
      await redisClient.del(key);
      console.log(`Deleted from cache: ${key}`);
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Cache delete error:', error.message);
      }
    }
  }

  /**
   * Get all keys matching a pattern using SCAN (non-blocking)
   * @param {string} pattern - Key pattern (e.g., "message:*")
   * @returns {array} Array of matching keys
   */
  async getKeysByPattern(pattern) {
    if (!this.isRedisReady()) {
      return [];
    }
    try {
      const keys = [];
      let cursor = 0;
      
      do {
        const reply = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100, // Scan 100 keys at a time
        });
        
        cursor = reply.cursor;
        keys.push(...reply.keys);
      } while (cursor !== 0);
      
      return keys;
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Pattern search error:', error.message);
      }
      return [];
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    if (!this.isRedisReady()) {
      return;
    }
    try {
      await redisClient.flushDb();
      console.log('All cache cleared');
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Cache clear error:', error.message);
      }
    }
  }
}

module.exports = new CacheService();
