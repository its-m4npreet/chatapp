const redisClient = require('../config/redis');

// Redis key prefixes - Write-behind caching architecture
const KEYS = {
  // Presence: per-user key with TTL (auto-expires if no heartbeat)
  PRESENCE_USER: 'presence:user:',     // presence:user:{userId} → socketId (TTL 60s)
  
  // Chat: last message as HASH
  CHAT_LAST: 'chat:last:',             // chat:last:{chatId} → HASH (TTL 120s)
  
  // Unread: per-user HASH with all chat counts
  CHAT_UNREAD: 'chat:unread:',         // chat:unread:{userId} → HASH { chatId: count }
  
  // Message Queue: Messages waiting to be persisted to MongoDB
  MSG_QUEUE: 'msg:queue',              // LIST of message JSON (FIFO queue)
  
  // Recent Messages: Per-chat LIST for fast retrieval
  MSG_RECENT: 'msg:recent:',           // msg:recent:{chatId} → LIST of recent messages
  
  // Message lookup by ID (for deduplication)
  MSG_LOOKUP: 'msg:id:',               // msg:id:{messageId} → message JSON
};

// TTL constants
const TTL = {
  PRESENCE: 60,        // 60 seconds - requires heartbeat to stay online
  LAST_MESSAGE: 120,   // 2 minutes for last message preview
  UNREAD: 604800,      // 7 days for unread counts
  RECENT_MESSAGES: 300, // 5 minutes for recent messages cache
  MESSAGE_LOOKUP: 600,  // 10 minutes for message lookup
};

class CacheService {
  constructor() {
    this.lastErrorTime = 0;
    this.errorSuppression = 5000;
  }

  isRedisReady() {
    return redisClient.isReady === true && redisClient.isOpen === true;
  }

  shouldLogError() {
    const now = Date.now();
    if (now - this.lastErrorTime > this.errorSuppression) {
      this.lastErrorTime = now;
      return true;
    }
    return false;
  }

  // ==================== PRESENCE TRACKING (TTL-based) ====================

  /**
   * Set user as online with TTL (requires periodic heartbeat)
   * @param {string} userId 
   * @param {string} socketId 
   * @param {boolean} showOnline - User's visibility preference
   */
  async userOnline(userId, socketId, showOnline = true) {
    if (!this.isRedisReady()) return;
    try {
      const key = KEYS.PRESENCE_USER + userId;
      
      if (showOnline) {
        // Store socketId with TTL - auto-expires if no heartbeat
        await redisClient.set(key, socketId, { EX: TTL.PRESENCE });
      } else {
        // User doesn't want to appear online - don't set presence key
        await redisClient.del(key);
      }
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis userOnline error:', error.message);
      }
    }
  }

  /**
   * Refresh presence TTL (heartbeat)
   * @param {string} userId 
   */
  async refreshPresence(userId) {
    if (!this.isRedisReady()) return;
    try {
      const key = KEYS.PRESENCE_USER + userId;
      // Only refresh if key exists (user wants to be visible)
      const exists = await redisClient.exists(key);
      if (exists) {
        await redisClient.expire(key, TTL.PRESENCE);
      }
    } catch (error) {
      // Silent fail for heartbeat
    }
  }

  /**
   * Remove user from online tracking
   * @param {string} userId 
   */
  async userOffline(userId) {
    if (!this.isRedisReady()) return;
    try {
      await redisClient.del(KEYS.PRESENCE_USER + userId);
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis userOffline error:', error.message);
      }
    }
  }

  /**
   * Update user's online visibility preference
   * @param {string} userId 
   * @param {string} socketId
   * @param {boolean} showOnline 
   */
  async updateOnlineStatus(userId, socketId, showOnline) {
    if (!this.isRedisReady()) return;
    try {
      const key = KEYS.PRESENCE_USER + userId;
      if (showOnline) {
        await redisClient.set(key, socketId, { EX: TTL.PRESENCE });
      } else {
        await redisClient.del(key);
      }
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis updateOnlineStatus error:', error.message);
      }
    }
  }

  /**
   * Get all visible online users by scanning presence keys
   * @returns {Promise<string[]>} Array of userIds
   */
  async getOnlineUsers() {
    if (!this.isRedisReady()) return [];
    try {
      const users = [];
      let cursor = 0;
      
      // SCAN for all presence:user:* keys
      do {
        const reply = await redisClient.scan(cursor, {
          MATCH: KEYS.PRESENCE_USER + '*',
          COUNT: 100,
        });
        cursor = reply.cursor;
        
        // Extract userId from key: presence:user:{userId}
        for (const key of reply.keys) {
          const userId = key.replace(KEYS.PRESENCE_USER, '');
          users.push(userId);
        }
      } while (cursor !== 0);
      
      return users;
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis getOnlineUsers error:', error.message);
      }
      return [];
    }
  }

  /**
   * Check if a specific user is online
   * @param {string} userId 
   * @returns {Promise<boolean>}
   */
  async isUserOnline(userId) {
    if (!this.isRedisReady()) return false;
    try {
      const exists = await redisClient.exists(KEYS.PRESENCE_USER + userId);
      return exists === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's socketId if online
   * @param {string} userId 
   * @returns {Promise<string|null>}
   */
  async getUserSocketId(userId) {
    if (!this.isRedisReady()) return null;
    try {
      return await redisClient.get(KEYS.PRESENCE_USER + userId);
    } catch (error) {
      return null;
    }
  }

  // ==================== LAST MESSAGE (HASH) ====================

  /**
   * Cache the last message for a conversation as HASH
   * @param {string} senderId 
   * @param {string} receiverId 
   * @param {object} message 
   */
  async cacheLastMessage(senderId, receiverId, message) {
    if (!this.isRedisReady()) return;
    try {
      // Normalize chatId (sorted user IDs)
      const chatId = [senderId, receiverId].sort().join(':');
      const key = KEYS.CHAT_LAST + chatId;
      
      await redisClient.hSet(key, {
        messageId: message._id.toString(),
        senderId: message.sender._id ? message.sender._id.toString() : message.sender.toString(),
        content: message.content || '',
        type: message.messageType || 'text',
        timestamp: (message.createdAt || new Date()).toISOString()
      });
      await redisClient.expire(key, TTL.LAST_MESSAGE);
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis cacheLastMessage error:', error.message);
      }
    }
  }

  /**
   * Get cached last message for a conversation
   * @param {string} user1 
   * @param {string} user2 
   * @returns {Promise<object|null>}
   */
  async getLastMessage(user1, user2) {
    if (!this.isRedisReady()) return null;
    try {
      const chatId = [user1, user2].sort().join(':');
      const key = KEYS.CHAT_LAST + chatId;
      const data = await redisClient.hGetAll(key);
      
      if (data && Object.keys(data).length > 0) {
        return {
          _id: data.messageId,
          sender: data.senderId,
          content: data.content,
          messageType: data.type,
          createdAt: data.timestamp
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // ==================== UNREAD COUNT (HASH per user) ====================

  /**
   * Increment unread count for a chat
   * @param {string} recipientId - User receiving the message
   * @param {string} senderId - User who sent the message (used as chatId)
   */
  async incrementUnread(recipientId, senderId) {
    if (!this.isRedisReady()) return;
    try {
      const key = KEYS.CHAT_UNREAD + recipientId;
      await redisClient.hIncrBy(key, senderId, 1);
      await redisClient.expire(key, TTL.UNREAD);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Clear unread count for a specific chat
   * @param {string} userId - The user whose unread we're clearing
   * @param {string} chatId - The chat (other user's ID) to clear
   */
  async clearUnread(userId, chatId) {
    if (!this.isRedisReady()) return;
    try {
      const key = KEYS.CHAT_UNREAD + userId;
      await redisClient.hDel(key, chatId);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get unread count for a specific chat
   * @param {string} userId 
   * @param {string} chatId 
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId, chatId) {
    if (!this.isRedisReady()) return 0;
    try {
      const key = KEYS.CHAT_UNREAD + userId;
      const count = await redisClient.hGet(key, chatId);
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all unread counts for a user
   * @param {string} userId 
   * @returns {Promise<object>} { chatId: count, ... }
   */
  async getAllUnreadCounts(userId) {
    if (!this.isRedisReady()) return {};
    try {
      const key = KEYS.CHAT_UNREAD + userId;
      const data = await redisClient.hGetAll(key);
      
      // Convert string values to numbers
      const counts = {};
      for (const [chatId, count] of Object.entries(data)) {
        counts[chatId] = parseInt(count, 10);
      }
      return counts;
    } catch (error) {
      return {};
    }
  }

  // ==================== MESSAGE QUEUE (Write-Behind Cache) ====================

  /**
   * Generate a normalized chatId from two user IDs
   * @param {string} user1 
   * @param {string} user2 
   * @returns {string}
   */
  getChatId(user1, user2) {
    return [user1, user2].sort().join(':');
  }

  /**
   * Store a new message in Redis (write-behind pattern)
   * Message goes to: 1) Queue for persistence, 2) Recent messages list, 3) Lookup cache
   * @param {object} messageData - The message object to store
   * @returns {Promise<object>} The message with generated tempId
   */
  async storeMessage(messageData) {
    if (!this.isRedisReady()) {
      return { ...messageData, _redisSkipped: true };
    }
    
    try {
      const chatId = this.getChatId(messageData.sender, messageData.receiver);
      const timestamp = Date.now();
      
      // Generate a temporary ID if not provided
      const tempId = messageData.tempId || `temp_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      
      const message = {
        ...messageData,
        tempId,
        _id: tempId, // Temporary ID until MongoDB assigns real one
        createdAt: new Date().toISOString(),
        status: 'pending', // Will be 'sent' after MongoDB persistence
        _persisted: false,
        _chatId: chatId,
        _timestamp: timestamp
      };
      
      const messageJson = JSON.stringify(message);
      
      // Use pipeline for atomic operations
      const pipeline = redisClient.multi();
      
      // 1. Add to persistence queue (FIFO - push to right, pop from left)
      pipeline.rPush(KEYS.MSG_QUEUE, messageJson);
      
      // 2. Add to recent messages for this chat (newest first - push to left)
      const recentKey = KEYS.MSG_RECENT + chatId;
      pipeline.lPush(recentKey, messageJson);
      pipeline.lTrim(recentKey, 0, 99); // Keep only last 100 messages
      pipeline.expire(recentKey, TTL.RECENT_MESSAGES);
      
      // 3. Store in lookup cache for deduplication
      pipeline.set(KEYS.MSG_LOOKUP + tempId, messageJson, { EX: TTL.MESSAGE_LOOKUP });
      
      await pipeline.exec();
      
      return message;
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis storeMessage error:', error.message);
      }
      return { ...messageData, _redisSkipped: true };
    }
  }

  /**
   * Get recent messages from Redis cache
   * @param {string} user1 
   * @param {string} user2 
   * @param {number} limit - Max messages to return
   * @returns {Promise<object[]>} Array of messages (newest first)
   */
  async getRecentMessages(user1, user2, limit = 50) {
    if (!this.isRedisReady()) return [];
    
    try {
      const chatId = this.getChatId(user1, user2);
      const key = KEYS.MSG_RECENT + chatId;
      
      const messages = await redisClient.lRange(key, 0, limit - 1);
      
      return messages.map(msg => {
        try {
          return JSON.parse(msg);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis getRecentMessages error:', error.message);
      }
      return [];
    }
  }

  /**
   * Get messages from queue for persistence (batch)
   * @param {number} batchSize - Number of messages to fetch
   * @returns {Promise<object[]>} Array of messages to persist
   */
  async getMessagesForPersistence(batchSize = 50) {
    if (!this.isRedisReady()) return [];
    
    try {
      const messages = [];
      
      // Pop messages from the left (oldest first - FIFO)
      for (let i = 0; i < batchSize; i++) {
        const msg = await redisClient.lPop(KEYS.MSG_QUEUE);
        if (!msg) break;
        
        try {
          const parsed = JSON.parse(msg);
          if (!parsed._persisted) {
            messages.push(parsed);
          }
        } catch {
          // Skip invalid JSON
        }
      }
      
      return messages;
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis getMessagesForPersistence error:', error.message);
      }
      return [];
    }
  }

  /**
   * Get queue length (for monitoring)
   * @returns {Promise<number>}
   */
  async getQueueLength() {
    if (!this.isRedisReady()) return 0;
    try {
      return await redisClient.lLen(KEYS.MSG_QUEUE);
    } catch {
      return 0;
    }
  }

  /**
   * Update message in recent cache after MongoDB persistence
   * @param {string} tempId - Original temp ID
   * @param {object} persistedMessage - Message with real MongoDB _id
   */
  async updatePersistedMessage(tempId, persistedMessage) {
    if (!this.isRedisReady()) return;
    
    try {
      const chatId = this.getChatId(
        persistedMessage.sender.toString(),
        persistedMessage.receiver.toString()
      );
      const recentKey = KEYS.MSG_RECENT + chatId;
      
      // Get all recent messages
      const messages = await redisClient.lRange(recentKey, 0, -1);
      
      // Find and update the message with tempId
      for (let i = 0; i < messages.length; i++) {
        try {
          const msg = JSON.parse(messages[i]);
          if (msg.tempId === tempId || msg._id === tempId) {
            // Update with persisted data
            const updated = {
              ...msg,
              _id: persistedMessage._id.toString(),
              status: persistedMessage.status || 'sent',
              _persisted: true,
              createdAt: persistedMessage.createdAt
            };
            
            // Replace in list
            await redisClient.lSet(recentKey, i, JSON.stringify(updated));
            
            // Update lookup cache
            await redisClient.set(
              KEYS.MSG_LOOKUP + persistedMessage._id.toString(),
              JSON.stringify(updated),
              { EX: TTL.MESSAGE_LOOKUP }
            );
            
            // Remove old temp lookup
            await redisClient.del(KEYS.MSG_LOOKUP + tempId);
            
            break;
          }
        } catch {
          // Skip invalid entries
        }
      }
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Redis updatePersistedMessage error:', error.message);
      }
    }
  }

  /**
   * Add a message that was persisted directly to MongoDB to the recent cache
   * @param {object} message - The MongoDB message document
   */
  async addToRecentCache(message) {
    if (!this.isRedisReady()) return;
    
    try {
      const senderId = message.sender._id ? message.sender._id.toString() : message.sender.toString();
      const receiverId = message.receiver._id ? message.receiver._id.toString() : message.receiver.toString();
      const chatId = this.getChatId(senderId, receiverId);
      const recentKey = KEYS.MSG_RECENT + chatId;
      
      const cacheMessage = {
        _id: message._id.toString(),
        sender: message.sender,
        receiver: receiverId,
        content: message.content,
        messageType: message.messageType,
        status: message.status,
        createdAt: message.createdAt,
        image: message.image,
        audio: message.audio,
        replyTo: message.replyTo,
        reactions: message.reactions,
        _persisted: true
      };
      
      const pipeline = redisClient.multi();
      pipeline.lPush(recentKey, JSON.stringify(cacheMessage));
      pipeline.lTrim(recentKey, 0, 99);
      pipeline.expire(recentKey, TTL.RECENT_MESSAGES);
      pipeline.set(
        KEYS.MSG_LOOKUP + message._id.toString(),
        JSON.stringify(cacheMessage),
        { EX: TTL.MESSAGE_LOOKUP }
      );
      
      await pipeline.exec();
    } catch (error) {
      // Silent fail - cache is optional
    }
  }

  /**
   * Get a message by ID from cache
   * @param {string} messageId 
   * @returns {Promise<object|null>}
   */
  async getMessageById(messageId) {
    if (!this.isRedisReady()) return null;
    try {
      const data = await redisClient.get(KEYS.MSG_LOOKUP + messageId);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Invalidate recent messages cache for a chat
   * @param {string} user1 
   * @param {string} user2 
   */
  async invalidateRecentMessages(user1, user2) {
    if (!this.isRedisReady()) return;
    try {
      const chatId = this.getChatId(user1, user2);
      await redisClient.del(KEYS.MSG_RECENT + chatId);
    } catch {
      // Silent fail
    }
  }

  // ==================== GENERIC CACHE METHODS ====================

  async setCache(key, data, ttl = 300) {
    if (!this.isRedisReady()) return;
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      if (this.shouldLogError()) {
        console.error('Cache set error:', error.message);
      }
    }
  }

  async getCache(key) {
    if (!this.isRedisReady()) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  async deleteCache(key) {
    if (!this.isRedisReady()) return;
    try {
      await redisClient.del(key);
    } catch (error) {
      // Silent fail
    }
  }
}

module.exports = new CacheService();
