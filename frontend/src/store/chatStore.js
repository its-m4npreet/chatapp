import { create } from 'zustand';
import indexedDBService from '../lib/indexedDB';

/**
 * Zustand store for chat state management
 * Organized by feature areas to minimize re-renders
 * 
 * 3-Tier Caching Integration:
 * 1. Zustand (in-memory) - fastest, current session
 * 2. IndexedDB (client) - persistent local cache
 * 3. Server (Redis/MongoDB) - source of truth
 */

// Initialize IndexedDB when store loads
indexedDBService.init().catch(console.error);

export const useChatStore = create((set, get) => ({
  // ============ CURRENT USER (for IndexedDB operations) ============
  currentUserId: null,
  setCurrentUserId: (userId) => set({ currentUserId: userId }),

  // ============ MESSAGE CACHE (per chat) ============
  // messageCache: { userId -> { messages: [], cursor, hasMore, loadedFromIDB } }
  messageCache: {},
  
  setMessageCache: (userId, messages, cursor, hasMore) => {
    const currentUserId = get().currentUserId;
    
    // Persist to IndexedDB in background
    if (currentUserId && messages.length > 0) {
      indexedDBService.saveMessages(messages, currentUserId).catch(console.error);
      indexedDBService.updateSyncTimestamp(currentUserId, userId).catch(console.error);
    }

    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [userId]: { messages, cursor, hasMore, loadedFromIDB: true },
      },
    }));
  },

  // Add single message to cache with automatic deduplication
  addMessageToCache: (userId, message) => {
    const currentUserId = get().currentUserId;
    
    // Persist to IndexedDB
    if (currentUserId) {
      indexedDBService.saveMessage(message, currentUserId).catch(console.error);
    }

    set((state) => {
      const cache = state.messageCache[userId];
      if (!cache) return state;

      // Check if message already exists - STRICT matching only
      const messageExists = cache.messages.some(
        (m) => m._id === message._id ||  // Match by actual ID
               (message.tempId && m.tempId === message.tempId)  // Match by tempId
      );

      if (messageExists) {
        // Message already exists, don't add duplicate
        return state;
      }

      return {
        messageCache: {
          ...state.messageCache,
          [userId]: {
            ...cache,
            messages: [...cache.messages, message],
          },
        },
      };
    });
  },

  // Prepend older messages (pagination)
  prependMessagesToCache: (userId, olderMessages, newCursor, newHasMore) =>
    set((state) => {
      const cache = state.messageCache[userId];
      if (!cache) return state;

      return {
        messageCache: {
          ...state.messageCache,
          [userId]: {
            ...cache,
            messages: [...olderMessages, ...cache.messages],
            cursor: newCursor,
            hasMore: newHasMore,
          },
        },
      };
    }),

  // Update message status (e.g., 'sending' -> 'sent')
  updateMessageStatus: (userId, messageId, status) =>
    set((state) => {
      const cache = state.messageCache[userId];
      if (!cache) return state;

      return {
        messageCache: {
          ...state.messageCache,
          [userId]: {
            ...cache,
            messages: cache.messages.map((msg) =>
              msg._id === messageId ? { ...msg, status } : msg
            ),
          },
        },
      };
    }),

  // Reconcile optimistic message (ONLY match by tempId, NO fuzzy matching)
  reconcileOptimisticMessage: (userId, incomingMessage) => {
    const currentUserId = get().currentUserId;
    
    // Reconcile in IndexedDB
    if (currentUserId && incomingMessage.tempId) {
      indexedDBService.reconcileMessage(incomingMessage.tempId, incomingMessage).catch(console.error);
    }

    set((state) => {
      const cache = state.messageCache[userId];
      if (!cache) return state;

      // Filter to remove duplicates - STRICT MATCHING ONLY
      const messages = cache.messages
        .filter((msg) => {
          // ONLY remove if exact tempId match
          if (incomingMessage.tempId && msg.tempId === incomingMessage.tempId && msg._id !== incomingMessage._id) {
            return false;
          }
          
          // Don't remove anything else - no fuzzy matching
          return true;
        })
        .map((msg) => {
          // Update if same message ID
          if (msg._id === incomingMessage._id && msg.status !== incomingMessage.status) {
            return incomingMessage;
          }
          return msg;
        });

      // Add incoming message if not already present
      const messageExists = messages.some((m) => m._id === incomingMessage._id);
      const finalMessages = messageExists ? messages : [...messages, incomingMessage];

      return {
        messageCache: {
          ...state.messageCache,
          [userId]: { ...cache, messages: finalMessages },
        },
      };
    });
  },

  // Add reaction to message
  addReactionToMessage: (userId, messageId, reaction, reactingUserId) =>
    set((state) => {
      const cache = state.messageCache[userId];
      if (!cache) return state;

      return {
        messageCache: {
          ...state.messageCache,
          [userId]: {
            ...cache,
            messages: cache.messages.map((msg) =>
              msg._id === messageId
                ? {
                    ...msg,
                    reactions: {
                      ...msg.reactions,
                      [reaction]: [
                        ...(msg.reactions?.[reaction] || []),
                        reactingUserId,
                      ],
                    },
                  }
                : msg
            ),
          },
        },
      };
    }),

  // Clear cache for a user (e.g., when switching chats)
  clearMessageCache: (userId) =>
    set((state) => {
      const { [userId]: _, ...rest } = state.messageCache;
      return { messageCache: rest };
    }),

  // Load messages from IndexedDB (called when opening a chat)
  loadMessagesFromIndexedDB: async (userId) => {
    const currentUserId = get().currentUserId;
    if (!currentUserId) return [];

    try {
      const cachedMessages = await indexedDBService.getMessages(currentUserId, userId, 50);
      
      if (cachedMessages.length > 0) {
        set((state) => ({
          messageCache: {
            ...state.messageCache,
            [userId]: {
              messages: cachedMessages,
              cursor: cachedMessages[0]?.createdAt || null,
              hasMore: cachedMessages.length >= 50, // Assume more if we hit limit
              loadedFromIDB: true,
            },
          },
        }));
      }

      return cachedMessages;
    } catch (error) {
      console.error('Failed to load messages from IndexedDB:', error);
      return [];
    }
  },

  // Clear all local data (for logout)
  clearAllLocalData: async () => {
    try {
      await indexedDBService.clearAll();
      set({
        messageCache: {},
        paginationState: {},
        currentUserId: null,
      });
    } catch (error) {
      console.error('Failed to clear local data:', error);
    }
  },

  // Aggressively remove duplicate messages
  removeDuplicateMessages: (userId) =>
    set((state) => {
      const cache = state.messageCache[userId];
      if (!cache) return state;

      const seen = new Set();
      const deduped = [];

      for (const msg of cache.messages) {
        const key = msg._id || msg.tempId || `${msg.content}-${msg.sender}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(msg);
        }
      }

      return {
        messageCache: {
          ...state.messageCache,
          [userId]: { ...cache, messages: deduped },
        },
      };
    }),

  // ============ PAGINATION STATE ============
  paginationState: {}, // { userId -> { cursor, hasMore, isLoading } }
  
  setPaginationState: (userId, cursor, hasMore, isLoading) =>
    set((state) => ({
      paginationState: {
        ...state.paginationState,
        [userId]: { cursor, hasMore, isLoading },
      },
    })),

  // ============ SOCKET CONNECTION STATE ============
  socketConnected: false,
  setSocketConnected: (connected) => set({ socketConnected: connected }),

  // ============ UI STATE (Shared across chat) ============
  showEmojiPicker: false,
  setShowEmojiPicker: (show) => set({ showEmojiPicker: show }),

  showReactionPicker: null, // messageId or null
  setShowReactionPicker: (messageId) => set({ showReactionPicker: messageId }),

  showLongPressReactions: null, // { messageId, x, y } or null
  setShowLongPressReactions: (pos) => set({ showLongPressReactions: pos }),

  replyingTo: null, // Message being replied to or null
  setReplyingTo: (message) => set({ replyingTo: message }),

  // ============ UNREAD COUNTS (with IndexedDB backing) ============
  unreadCounts: {}, // { chatId: count }
  
  setUnreadCount: async (otherUserId, count) => {
    const currentUserId = get().currentUserId;
    
    // Persist to IndexedDB
    if (currentUserId) {
      await indexedDBService.setUnreadCount(currentUserId, otherUserId, count);
    }

    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [otherUserId]: count,
      },
    }));
  },

  incrementUnreadCount: async (otherUserId) => {
    const currentUserId = get().currentUserId;
    
    if (currentUserId) {
      const newCount = await indexedDBService.incrementUnreadCount(currentUserId, otherUserId);
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [otherUserId]: newCount,
        },
      }));
      return newCount;
    }
    
    // Fallback if no currentUserId
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [otherUserId]: (state.unreadCounts[otherUserId] || 0) + 1,
      },
    }));
  },

  clearUnreadCount: async (otherUserId) => {
    const currentUserId = get().currentUserId;
    
    if (currentUserId) {
      await indexedDBService.clearUnreadCount(currentUserId, otherUserId);
    }

    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [otherUserId]: 0,
      },
    }));
  },

  loadUnreadCountsFromIndexedDB: async () => {
    try {
      const counts = await indexedDBService.getAllUnreadCounts();
      
      // Convert chatId format to userId format
      const userCounts = {};
      const currentUserId = get().currentUserId;
      
      for (const [chatId, count] of Object.entries(counts)) {
        const [user1, user2] = chatId.split(':');
        const otherUserId = user1 === currentUserId ? user2 : user1;
        userCounts[otherUserId] = count;
      }
      
      set({ unreadCounts: userCounts });
    } catch (error) {
      console.error('Failed to load unread counts from IndexedDB:', error);
    }
  },

  // ============ HELPER SELECTORS ============
  // Get messages for a specific user (memoized selector)
  getMessagesForUser: (userId) => {
    const state = get();
    return state.messageCache[userId]?.messages || [];
  },

  getCacheForUser: (userId) => {
    const state = get();
    return state.messageCache[userId] || { messages: [], cursor: null, hasMore: true, loadedFromIDB: false };
  },

  getPaginationForUser: (userId) => {
    const state = get();
    return state.paginationState[userId] || { cursor: null, hasMore: true, isLoading: false };
  },

  // ============ PENDING MESSAGES (Offline Support) ============
  pendingMessages: [], // Messages waiting to be sent
  
  addPendingMessage: async (message) => {
    const pending = await indexedDBService.savePendingMessage(message);
    if (pending) {
      set((state) => ({
        pendingMessages: [...state.pendingMessages, pending],
      }));
    }
    return pending;
  },

  removePendingMessage: async (tempId) => {
    await indexedDBService.removePendingMessage(tempId);
    set((state) => ({
      pendingMessages: state.pendingMessages.filter(m => m.tempId !== tempId),
    }));
  },

  loadPendingMessages: async () => {
    try {
      const pending = await indexedDBService.getPendingMessages();
      set({ pendingMessages: pending });
      return pending;
    } catch (error) {
      console.error('Failed to load pending messages:', error);
      return [];
    }
  },

  // Get IndexedDB service reference (for advanced operations)
  getIndexedDBService: () => indexedDBService,
}));

/**
 * HOOKS FOR OPTIMIZED SELECTORS
 * Use these to subscribe only to specific parts of state
 */

// Messages for a chat
export const useMessagesForUser = (userId) =>
  useChatStore((state) => state.messageCache[userId]?.messages || []);

// Pagination info
export const usePaginationForUser = (userId) =>
  useChatStore((state) => state.paginationState[userId] || { cursor: null, hasMore: true, isLoading: false });

// Socket connection
export const useSocketConnected = () =>
  useChatStore((state) => state.socketConnected);

// UI state (reactions, replies)
export const useReplyingTo = () =>
  useChatStore((state) => state.replyingTo);

export const useShowReactionPicker = () =>
  useChatStore((state) => state.showReactionPicker);

export const useShowEmojiPicker = () =>
  useChatStore((state) => state.showEmojiPicker);

// Unread counts
export const useUnreadCounts = () =>
  useChatStore((state) => state.unreadCounts);

export const useUnreadCountForUser = (userId) =>
  useChatStore((state) => state.unreadCounts[userId] || 0);

// Pending messages
export const usePendingMessages = () =>
  useChatStore((state) => state.pendingMessages);

// Export IndexedDB service for direct access if needed
export { indexedDBService };
