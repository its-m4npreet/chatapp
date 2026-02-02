/**
 * IndexedDB Service for Chat Application
 * 
 * Provides local storage for:
 * - Messages (per chat, recent messages cache)
 * - Chat previews (last message for sidebar)
 * - Unread counts
 * - Pending messages (for offline support)
 * 
 * 3-Tier Caching:
 * 1. IndexedDB (client) - fastest, works offline
 * 2. Redis (server) - fast, shared across devices
 * 3. MongoDB (server) - persistent, source of truth
 */

const DB_NAME = 'ChatAppDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  MESSAGES: 'messages',           // All messages
  CHAT_PREVIEW: 'chatPreview',    // Last message per chat
  UNREAD_COUNTS: 'unreadCounts',  // Unread count per chat
  PENDING_MESSAGES: 'pendingMessages', // Messages waiting to be sent
  SYNC_META: 'syncMeta',          // Sync timestamps per chat
};

class IndexedDBService {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initPromise = null;
  }

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.isReady && this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Messages store - indexed by chatId and createdAt for efficient queries
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messagesStore = db.createObjectStore(STORES.MESSAGES, { keyPath: '_id' });
          messagesStore.createIndex('chatId', 'chatId', { unique: false });
          messagesStore.createIndex('chatId_createdAt', ['chatId', 'createdAt'], { unique: false });
          messagesStore.createIndex('tempId', 'tempId', { unique: false });
          messagesStore.createIndex('status', 'status', { unique: false });
        }

        // Chat preview store - one entry per chat
        if (!db.objectStoreNames.contains(STORES.CHAT_PREVIEW)) {
          db.createObjectStore(STORES.CHAT_PREVIEW, { keyPath: 'chatId' });
        }

        // Unread counts store
        if (!db.objectStoreNames.contains(STORES.UNREAD_COUNTS)) {
          db.createObjectStore(STORES.UNREAD_COUNTS, { keyPath: 'chatId' });
        }

        // Pending messages store (for offline support)
        if (!db.objectStoreNames.contains(STORES.PENDING_MESSAGES)) {
          const pendingStore = db.createObjectStore(STORES.PENDING_MESSAGES, { keyPath: 'tempId' });
          pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
          db.createObjectStore(STORES.SYNC_META, { keyPath: 'chatId' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is ready before operations
   */
  async ensureReady() {
    if (!this.isReady || !this.db) {
      await this.init();
    }
    return this.db;
  }

  /**
   * Generate a normalized chatId from two user IDs
   * @param {string} userId1 
   * @param {string} userId2 
   * @returns {string}
   */
  getChatId(userId1, userId2) {
    return [userId1, userId2].sort().join(':');
  }

  // ==================== MESSAGE OPERATIONS ====================

  /**
   * Save a message to IndexedDB
   * @param {object} message - Message object
   * @param {string} currentUserId - Current user's ID
   */
  async saveMessage(message, currentUserId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);

      // Determine the other user in the chat
      const senderId = message.sender?._id || message.sender;
      const receiverId = message.receiver?._id || message.receiver;
      const otherUserId = senderId === currentUserId ? receiverId : senderId;
      
      const chatId = this.getChatId(currentUserId, otherUserId);

      const messageToStore = {
        ...message,
        _id: message._id || message.tempId,
        chatId,
        createdAt: message.createdAt || new Date().toISOString(),
        storedAt: Date.now()
      };

      await new Promise((resolve, reject) => {
        const request = store.put(messageToStore);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Also update chat preview
      await this.updateChatPreview(chatId, message);

    } catch (error) {
      console.error('IndexedDB saveMessage error:', error);
    }
  }

  /**
   * Save multiple messages at once
   * @param {array} messages - Array of messages
   * @param {string} currentUserId - Current user's ID
   */
  async saveMessages(messages, currentUserId) {
    if (!messages || messages.length === 0) return;

    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);

      for (const message of messages) {
        const senderId = message.sender?._id || message.sender;
        const receiverId = message.receiver?._id || message.receiver;
        const otherUserId = senderId === currentUserId ? receiverId : senderId;
        const chatId = this.getChatId(currentUserId, otherUserId);

        const messageToStore = {
          ...message,
          _id: message._id || message.tempId,
          chatId,
          createdAt: message.createdAt || new Date().toISOString(),
          storedAt: Date.now()
        };

        store.put(messageToStore);
      }

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

    } catch (error) {
      console.error('IndexedDB saveMessages error:', error);
    }
  }

  /**
   * Get messages for a chat (newest first, with limit)
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   * @param {number} limit 
   * @param {string} beforeTimestamp - For pagination
   * @returns {Promise<array>}
   */
  async getMessages(currentUserId, otherUserId, limit = 50, beforeTimestamp = null) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.MESSAGES, 'readonly');
      const store = tx.objectStore(STORES.MESSAGES);
      const index = store.index('chatId_createdAt');
      
      const chatId = this.getChatId(currentUserId, otherUserId);
      
      // Get messages for this chat, sorted by createdAt descending
      const messages = [];
      
      return new Promise((resolve, reject) => {
        // Use a key range for the chatId
        const range = beforeTimestamp
          ? IDBKeyRange.bound([chatId, ''], [chatId, beforeTimestamp], false, true)
          : IDBKeyRange.bound([chatId, ''], [chatId, '\uffff']);
        
        const request = index.openCursor(range, 'prev'); // Descending order
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && messages.length < limit) {
            messages.push(cursor.value);
            cursor.continue();
          } else {
            // Reverse to get chronological order for display
            resolve(messages.reverse());
          }
        };
        
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getMessages error:', error);
      return [];
    }
  }

  /**
   * Get a message by ID
   * @param {string} messageId 
   * @returns {Promise<object|null>}
   */
  async getMessage(messageId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.MESSAGES, 'readonly');
      const store = tx.objectStore(STORES.MESSAGES);

      return new Promise((resolve, reject) => {
        const request = store.get(messageId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getMessage error:', error);
      return null;
    }
  }

  /**
   * Update a message (e.g., status change, add reactions)
   * @param {string} messageId 
   * @param {object} updates 
   */
  async updateMessage(messageId, updates) {
    try {
      const existing = await this.getMessage(messageId);
      if (!existing) return;

      const db = await this.ensureReady();
      const tx = db.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);

      const updated = { ...existing, ...updates, updatedAt: Date.now() };
      
      await new Promise((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB updateMessage error:', error);
    }
  }

  /**
   * Update message by tempId (when server confirms with real _id)
   * @param {string} tempId 
   * @param {object} serverMessage 
   */
  async reconcileMessage(tempId, serverMessage) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);
      const index = store.index('tempId');

      return new Promise((resolve, reject) => {
        const request = index.get(tempId);
        request.onsuccess = async () => {
          const existing = request.result;
          if (existing) {
            // Delete the temp entry
            store.delete(existing._id);
            
            // Add the server message with real _id
            const updated = {
              ...existing,
              ...serverMessage,
              _id: serverMessage._id,
              tempId: tempId, // Keep tempId for reference
              status: serverMessage.status || 'sent',
              reconciledAt: Date.now()
            };
            store.put(updated);
          }
          resolve();
        };
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB reconcileMessage error:', error);
    }
  }

  /**
   * Delete old messages (cleanup)
   * @param {number} olderThanDays 
   */
  async cleanupOldMessages(olderThanDays = 30) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.MESSAGES);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffStr = cutoffDate.toISOString();

      return new Promise((resolve, reject) => {
        const request = store.openCursor();
        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.createdAt < cutoffStr) {
              cursor.delete();
              deletedCount++;
            }
            cursor.continue();
          } else {
            console.log(`IndexedDB: Cleaned up ${deletedCount} old messages`);
            resolve(deletedCount);
          }
        };
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB cleanup error:', error);
      return 0;
    }
  }

  // ==================== CHAT PREVIEW OPERATIONS ====================

  /**
   * Update the last message preview for a chat
   * @param {string} chatId 
   * @param {object} message 
   */
  async updateChatPreview(chatId, message) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.CHAT_PREVIEW, 'readwrite');
      const store = tx.objectStore(STORES.CHAT_PREVIEW);

      const preview = {
        chatId,
        messageId: message._id || message.tempId,
        senderId: message.sender?._id || message.sender,
        content: message.content || '',
        messageType: message.messageType || 'text',
        createdAt: message.createdAt || new Date().toISOString(),
        updatedAt: Date.now()
      };

      await new Promise((resolve, reject) => {
        const request = store.put(preview);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB updateChatPreview error:', error);
    }
  }

  /**
   * Get chat preview (last message)
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   * @returns {Promise<object|null>}
   */
  async getChatPreview(currentUserId, otherUserId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.CHAT_PREVIEW, 'readonly');
      const store = tx.objectStore(STORES.CHAT_PREVIEW);
      
      const chatId = this.getChatId(currentUserId, otherUserId);

      return new Promise((resolve, reject) => {
        const request = store.get(chatId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getChatPreview error:', error);
      return null;
    }
  }

  /**
   * Get all chat previews
   * @returns {Promise<array>}
   */
  async getAllChatPreviews() {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.CHAT_PREVIEW, 'readonly');
      const store = tx.objectStore(STORES.CHAT_PREVIEW);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getAllChatPreviews error:', error);
      return [];
    }
  }

  // ==================== UNREAD COUNT OPERATIONS ====================

  /**
   * Set unread count for a chat
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   * @param {number} count 
   */
  async setUnreadCount(currentUserId, otherUserId, count) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.UNREAD_COUNTS, 'readwrite');
      const store = tx.objectStore(STORES.UNREAD_COUNTS);
      
      const chatId = this.getChatId(currentUserId, otherUserId);

      await new Promise((resolve, reject) => {
        const request = store.put({ chatId, count, updatedAt: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB setUnreadCount error:', error);
    }
  }

  /**
   * Increment unread count
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   */
  async incrementUnreadCount(currentUserId, otherUserId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.UNREAD_COUNTS, 'readwrite');
      const store = tx.objectStore(STORES.UNREAD_COUNTS);
      
      const chatId = this.getChatId(currentUserId, otherUserId);

      return new Promise((resolve, reject) => {
        const getRequest = store.get(chatId);
        getRequest.onsuccess = () => {
          const current = getRequest.result?.count || 0;
          const putRequest = store.put({ 
            chatId, 
            count: current + 1, 
            updatedAt: Date.now() 
          });
          putRequest.onsuccess = () => resolve(current + 1);
          putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
      });

    } catch (error) {
      console.error('IndexedDB incrementUnreadCount error:', error);
      return 0;
    }
  }

  /**
   * Clear unread count for a chat
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   */
  async clearUnreadCount(currentUserId, otherUserId) {
    await this.setUnreadCount(currentUserId, otherUserId, 0);
  }

  /**
   * Get unread count for a chat
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   * @returns {Promise<number>}
   */
  async getUnreadCount(currentUserId, otherUserId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.UNREAD_COUNTS, 'readonly');
      const store = tx.objectStore(STORES.UNREAD_COUNTS);
      
      const chatId = this.getChatId(currentUserId, otherUserId);

      return new Promise((resolve, reject) => {
        const request = store.get(chatId);
        request.onsuccess = () => resolve(request.result?.count || 0);
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getUnreadCount error:', error);
      return 0;
    }
  }

  /**
   * Get all unread counts
   * @returns {Promise<object>} { chatId: count, ... }
   */
  async getAllUnreadCounts() {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.UNREAD_COUNTS, 'readonly');
      const store = tx.objectStore(STORES.UNREAD_COUNTS);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const counts = {};
          for (const item of request.result || []) {
            counts[item.chatId] = item.count;
          }
          resolve(counts);
        };
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getAllUnreadCounts error:', error);
      return {};
    }
  }

  // ==================== PENDING MESSAGES (Offline Support) ====================

  /**
   * Save a pending message (for offline sending)
   * @param {object} message 
   */
  async savePendingMessage(message) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.PENDING_MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_MESSAGES);

      const pending = {
        ...message,
        tempId: message.tempId || `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      await new Promise((resolve, reject) => {
        const request = store.put(pending);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      return pending;

    } catch (error) {
      console.error('IndexedDB savePendingMessage error:', error);
      return null;
    }
  }

  /**
   * Get all pending messages
   * @returns {Promise<array>}
   */
  async getPendingMessages() {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.PENDING_MESSAGES, 'readonly');
      const store = tx.objectStore(STORES.PENDING_MESSAGES);

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getPendingMessages error:', error);
      return [];
    }
  }

  /**
   * Remove a pending message (after successful send)
   * @param {string} tempId 
   */
  async removePendingMessage(tempId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.PENDING_MESSAGES, 'readwrite');
      const store = tx.objectStore(STORES.PENDING_MESSAGES);

      await new Promise((resolve, reject) => {
        const request = store.delete(tempId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB removePendingMessage error:', error);
    }
  }

  // ==================== SYNC METADATA ====================

  /**
   * Update sync timestamp for a chat
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   */
  async updateSyncTimestamp(currentUserId, otherUserId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.SYNC_META, 'readwrite');
      const store = tx.objectStore(STORES.SYNC_META);
      
      const chatId = this.getChatId(currentUserId, otherUserId);

      await new Promise((resolve, reject) => {
        const request = store.put({ 
          chatId, 
          lastSyncAt: Date.now(),
          lastSyncISOString: new Date().toISOString()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB updateSyncTimestamp error:', error);
    }
  }

  /**
   * Get last sync timestamp for a chat
   * @param {string} currentUserId 
   * @param {string} otherUserId 
   * @returns {Promise<number|null>}
   */
  async getLastSyncTimestamp(currentUserId, otherUserId) {
    try {
      const db = await this.ensureReady();
      const tx = db.transaction(STORES.SYNC_META, 'readonly');
      const store = tx.objectStore(STORES.SYNC_META);
      
      const chatId = this.getChatId(currentUserId, otherUserId);

      return new Promise((resolve, reject) => {
        const request = store.get(chatId);
        request.onsuccess = () => resolve(request.result?.lastSyncAt || null);
        request.onerror = () => reject(request.error);
      });

    } catch (error) {
      console.error('IndexedDB getLastSyncTimestamp error:', error);
      return null;
    }
  }

  // ==================== DATABASE UTILITIES ====================

  /**
   * Clear all data (for logout)
   */
  async clearAll() {
    try {
      const db = await this.ensureReady();
      
      const stores = [
        STORES.MESSAGES,
        STORES.CHAT_PREVIEW,
        STORES.UNREAD_COUNTS,
        STORES.PENDING_MESSAGES,
        STORES.SYNC_META
      ];

      for (const storeName of stores) {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await new Promise((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }

      console.log('IndexedDB: All data cleared');

    } catch (error) {
      console.error('IndexedDB clearAll error:', error);
    }
  }

  /**
   * Get database stats
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const db = await this.ensureReady();
      
      const stats = {};
      const stores = [STORES.MESSAGES, STORES.CHAT_PREVIEW, STORES.UNREAD_COUNTS, STORES.PENDING_MESSAGES];

      for (const storeName of stores) {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        
        stats[storeName] = await new Promise((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      return stats;

    } catch (error) {
      console.error('IndexedDB getStats error:', error);
      return {};
    }
  }
}

// Export singleton instance
const indexedDBService = new IndexedDBService();
export default indexedDBService;
