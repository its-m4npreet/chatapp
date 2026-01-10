const redisClient = require('../config/redis');

class CacheService {
  constructor(cacheTTL = 5) {
    this.cacheTTL = cacheTTL; // TTL in seconds (default 5 seconds)
  }

  /**
   * Set data in cache with TTL
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   * @param {number} ttl - Time to live in seconds (optional, uses default if not provided)
   */
  async setCache(key, data, ttl = this.cacheTTL) {
    try {
      const serialized = JSON.stringify(data);
      await redisClient.setEx(key, ttl, serialized);
      console.log(`Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {object|null} Cached data or null if not found
   */
  async getCache(key) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        console.log(`Cache hit: ${key}`);
        return JSON.parse(data);
      }
      console.log(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Delete data from cache
   * @param {string} key - Cache key
   */
  async deleteCache(key) {
    try {
      await redisClient.del(key);
      console.log(`Deleted from cache: ${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., "message:*")
   * @returns {array} Array of matching keys
   */
  async getKeysByPattern(pattern) {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      console.error('Pattern search error:', error);
      return [];
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    try {
      await redisClient.flushDb();
      console.log('All cache cleared');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }
}

module.exports = new CacheService();
