/**
 * Performance utilities for chat optimization
 */

/**
 * Throttle function - limits how often a function is called
 * @param {Function} fn - Function to throttle
 * @param {number} ms - Throttle interval in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (fn, ms) => {
  let last = 0;
  let timeoutId = null;

  return function throttled(...args) {
    const now = Date.now();

    if (now - last >= ms) {
      last = now;
      fn(...args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        last = Date.now();
        fn(...args);
      }, ms - (now - last));
    }
  };
};

/**
 * Debounce function - delays execution until after timeout
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Debounce delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (fn, ms) => {
  let timeoutId = null;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, ms);
  };
};

/**
 * Determine if elements should be grouped (consecutive messages from same user)
 * @param {Object} current - Current message
 * @param {Object} previous - Previous message
 * @param {number} timeThreshold - Time threshold in ms (default 5 minutes)
 * @returns {boolean} True if should group
 */
export const shouldGroupMessages = (current, previous, timeThreshold = 5 * 60 * 1000) => {
  if (!previous) return false;

  const currentSenderId = typeof current.sender === 'object' ? current.sender._id : current.sender;
  const previousSenderId = typeof previous.sender === 'object' ? previous.sender._id : previous.sender;

  if (currentSenderId !== previousSenderId) return false;

  const currentTime = new Date(current.createdAt).getTime();
  const previousTime = new Date(previous.createdAt).getTime();

  return Math.abs(currentTime - previousTime) < timeThreshold;
};

/**
 * Extract ID from user object or string
 * @param {Object|string} user - User object or ID string
 * @returns {string} User ID
 */
export const getUserId = (user) => {
  return typeof user === 'object' ? user?._id : user;
};

/**
 * Create lazy loaded image component wrapper
 * Useful for avatar and group images
 */
export const createLazyImage = (src, alt, fallback) => {
  return {
    src,
    alt,
    loading: 'lazy',
    decoding: 'async',
    onError: (e) => {
      e.target.src = fallback;
    },
  };
};

/**
 * Check if message should show sender info (name/avatar)
 * Shows for first message or after time gap
 * @param {Object} current - Current message
 * @param {Object} previous - Previous message
 * @param {number} timeThreshold - Time threshold in ms (default 5 minutes)
 * @returns {boolean} True if should show sender info
 */
export const shouldShowSenderInfo = (current, previous, timeThreshold = 5 * 60 * 1000) => {
  if (!previous) return true; // First message always shows sender info

  const currentSenderId = getUserId(current.sender);
  const previousSenderId = getUserId(previous.sender);

  if (currentSenderId !== previousSenderId) return true;

  const currentTime = new Date(current.createdAt).getTime();
  const previousTime = new Date(previous.createdAt).getTime();

  return Math.abs(currentTime - previousTime) >= timeThreshold;
};

/**
 * Batch socket emissions
 * Useful for reducing socket events (e.g., read receipts)
 */
export class SocketEventBatcher {
  constructor(socket, batchDelayMs = 1000) {
    this.socket = socket;
    this.batchDelayMs = batchDelayMs;
    this.batches = {}; // { eventName -> [args] }
    this.timers = {}; // { eventName -> timeoutId }
  }

  /**
   * Add event to batch and emit after delay
   * @param {string} eventName - Socket event name
   * @param {*} data - Event data
   */
  batch(eventName, data) {
    if (!this.batches[eventName]) {
      this.batches[eventName] = [];
    }

    this.batches[eventName].push(data);

    // Clear existing timer
    if (this.timers[eventName]) {
      clearTimeout(this.timers[eventName]);
    }

    // Set new timer to emit batch
    this.timers[eventName] = setTimeout(() => {
      const batch = this.batches[eventName];
      delete this.batches[eventName];
      delete this.timers[eventName];

      if (batch && batch.length > 0) {
        this.socket.emit(eventName, batch);
      }
    }, this.batchDelayMs);
  }

  /**
   * Flush all pending batches immediately
   */
  flush() {
    Object.keys(this.batches).forEach((eventName) => {
      clearTimeout(this.timers[eventName]);
      const batch = this.batches[eventName];

      if (batch && batch.length > 0) {
        this.socket.emit(eventName, batch);
      }

      delete this.batches[eventName];
      delete this.timers[eventName];
    });
  }
}

/**
 * Message deduplication helper
 * Prevents duplicate messages in the list
 */
export class MessageDeduplicator {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.ids = new Set();
    this.tempIds = new Map(); // tempId -> actual _id mapping
    this.messageIds = new Map(); // _id -> tempId mapping
  }

  /**
   * Add message ID
   * @param {string} id - Message ID
   * @param {string} tempId - Optional temporary ID
   * @returns {boolean} True if new message
   */
  add(id, tempId) {
    const isNew = !this.ids.has(id);

    if (isNew) {
      this.ids.add(id);
      if (tempId) {
        this.tempIds.set(tempId, id);
        this.messageIds.set(id, tempId);
      }

      // Keep size under control
      if (this.ids.size > this.maxSize) {
        const firstId = this.ids.values().next().value;
        const tempId = this.messageIds.get(firstId);
        this.ids.delete(firstId);
        if (tempId) {
          this.tempIds.delete(tempId);
          this.messageIds.delete(firstId);
        }
      }
    }

    return isNew;
  }

  /**
   * Check if message exists
   * @param {string} id - Message ID
   * @param {string} tempId - Optional temporary ID
   * @returns {boolean} True if exists
   */
  has(id, tempId) {
    return this.ids.has(id) || (tempId && this.tempIds.has(tempId));
  }

  /**
   * Get actual ID from tempId
   * @param {string} tempId - Temporary ID
   * @returns {string|null} Actual message ID or null
   */
  getActualId(tempId) {
    return this.tempIds.get(tempId) || null;
  }

  /**
   * Remove by actual ID
   * @param {string} id - Message ID to remove
   */
  remove(id) {
    const tempId = this.messageIds.get(id);
    this.ids.delete(id);
    if (tempId) {
      this.tempIds.delete(tempId);
      this.messageIds.delete(id);
    }
  }

  /**
   * Remove by tempId
   * @param {string} tempId - Temporary ID to remove
   */
  removeTempId(tempId) {
    const actualId = this.tempIds.get(tempId);
    if (actualId) {
      this.remove(actualId);
    }
  }

  clear() {
    this.ids.clear();
    this.tempIds.clear();
    this.messageIds.clear();
  }
}

/**
 * Intersection Observer wrapper for lazy loading
 * Useful for avatar images, group avatars, lazy component loading
 */
export class LazyLoadObserver {
  constructor(options = {}) {
    this.options = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    };
    this.observer = null;
    this.targets = new Map();
  }

  /**
   * Initialize observer
   */
  init() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const callback = this.targets.get(entry.target);
          if (callback) {
            callback();
          }
          this.observer.unobserve(entry.target);
        }
      });
    }, this.options);
  }

  /**
   * Observe element
   * @param {Element} element - Element to observe
   * @param {Function} callback - Callback when visible
   */
  observe(element, callback) {
    if (!this.observer) {
      this.init();
    }

    this.targets.set(element, callback);
    this.observer.observe(element);
  }

  /**
   * Unobserve element
   * @param {Element} element - Element to stop observing
   */
  unobserve(element) {
    if (this.observer) {
      this.observer.unobserve(element);
      this.targets.delete(element);
    }
  }

  /**
   * Clean up observer
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.targets.clear();
    }
  }
}

/**
 * Memory-efficient LRU cache for message data
 * Keeps only recent messages in memory
 */
export class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Remove oldest item if exceeds max size
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {boolean} True if exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns {number} Current size
   */
  size() {
    return this.cache.size;
  }
}
