const cacheService = require('../services/cacheService');
const Message = require('../model/message');

/**
 * Cache Persistence Worker
 * 
 * This worker implements write-behind caching:
 * 1. Messages are first stored in Redis (fast writes)
 * 2. Worker periodically fetches messages from Redis queue
 * 3. Batch inserts messages into MongoDB
 * 4. Updates Redis cache with MongoDB IDs
 * 
 * Benefits:
 * - Fast message sending (Redis write vs MongoDB write)
 * - Batch inserts reduce MongoDB load
 * - Messages available immediately from Redis
 */

class CachePersistenceWorker {
  constructor(checkInterval = 3000) { // Check every 3 seconds
    this.checkInterval = checkInterval;
    this.isRunning = false;
    this.intervalId = null;
    this.batchSize = 50; // Process up to 50 messages per batch
    this.io = null; // Socket.IO instance for status updates
  }

  /**
   * Set Socket.IO instance for real-time status updates
   * @param {object} io - Socket.IO server instance
   */
  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Start the persistence worker
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('Cache persistence worker started (interval: ' + this.checkInterval + 'ms)');

    // Run persistence immediately, then periodically
    this.persistMessages();
    
    this.intervalId = setInterval(() => {
      this.persistMessages();
    }, this.checkInterval);
  }

  /**
   * Stop the persistence worker
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isRunning = false;
      console.log('Cache persistence worker stopped');
    }
  }

  /**
   * Persist messages from Redis queue to MongoDB
   */
  async persistMessages() {
    if (!cacheService.isRedisReady()) {
      return;
    }

    try {
      // Get messages from queue
      const messages = await cacheService.getMessagesForPersistence(this.batchSize);
      
      if (messages.length === 0) {
        return;
      }

      // Process each message
      const persistedMessages = [];
      const errors = [];

      for (const msg of messages) {
        try {
          // Check if already persisted (deduplication)
          if (msg._persisted) {
            continue;
          }

          // Create MongoDB document
          const messageDoc = new Message({
            sender: msg.sender,
            receiver: msg.receiver,
            content: msg.content || '',
            image: msg.image,
            audio: msg.audio,
            messageType: msg.messageType || 'text',
            status: 'sent',
            replyTo: msg.replyTo || null,
            isForwarded: msg.isForwarded || false,
            createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date()
          });

          // Save to MongoDB
          await messageDoc.save();

          // Populate sender info for the response
          await messageDoc.populate('sender', 'name profilePicture');

          // Update Redis cache with real MongoDB ID
          await cacheService.updatePersistedMessage(msg.tempId || msg._id, messageDoc);

          // Update last message cache
          await cacheService.cacheLastMessage(
            msg.sender.toString(),
            msg.receiver.toString(),
            messageDoc
          );

          persistedMessages.push({
            tempId: msg.tempId,
            realId: messageDoc._id.toString(),
            sender: msg.sender,
            receiver: msg.receiver
          });

          // Emit status update to sender if Socket.IO is available
          if (this.io && msg.sender) {
            this.io.to(msg.sender.toString()).emit('messageStatusUpdate', {
              tempId: msg.tempId,
              messageId: messageDoc._id,
              status: 'sent'
            });

            // Check if receiver is online and mark as delivered
            const isReceiverOnline = await cacheService.isUserOnline(msg.receiver);
            if (isReceiverOnline) {
              messageDoc.status = 'delivered';
              await messageDoc.save();
              
              this.io.to(msg.sender.toString()).emit('messageStatusUpdate', {
                messageId: messageDoc._id,
                status: 'delivered'
              });
            } else {
              // Increment unread for offline user
              await cacheService.incrementUnread(msg.receiver, msg.sender);
            }
          }

        } catch (error) {
          errors.push({ tempId: msg.tempId, error: error.message });
          
          // If it's a critical error, log it
          if (!error.message.includes('duplicate')) {
            console.error('Error persisting message:', error.message);
          }
        }
      }

      // Log batch result if there were messages
      if (persistedMessages.length > 0 || errors.length > 0) {
        const queueLength = await cacheService.getQueueLength();
        console.log(`Persisted ${persistedMessages.length} messages, ${errors.length} errors, ${queueLength} remaining in queue`);
      }

    } catch (error) {
      console.error('Cache persistence error:', error.message);
    }
  }

  /**
   * Get current queue status
   * @returns {Promise<object>}
   */
  async getStatus() {
    const queueLength = await cacheService.getQueueLength();
    return {
      isRunning: this.isRunning,
      queueLength,
      batchSize: this.batchSize,
      checkInterval: this.checkInterval
    };
  }
}

module.exports = CachePersistenceWorker;
