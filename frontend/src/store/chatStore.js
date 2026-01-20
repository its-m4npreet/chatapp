import { create } from 'zustand';

/**
 * Zustand store for chat state management
 * Organized by feature areas to minimize re-renders
 */

export const useChatStore = create((set, get) => ({
  // ============ MESSAGE CACHE (per chat) ============
  // messageCache: { userId -> { messages: [], cursor, hasMore } }
  messageCache: {},
  
  setMessageCache: (userId, messages, cursor, hasMore) =>
    set((state) => ({
      messageCache: {
        ...state.messageCache,
        [userId]: { messages, cursor, hasMore },
      },
    })),

  // Add single message to cache with automatic deduplication
  addMessageToCache: (userId, message) =>
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
    }),

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
  reconcileOptimisticMessage: (userId, incomingMessage) =>
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
    }),

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

  // ============ HELPER SELECTORS ============
  // Get messages for a specific user (memoized selector)
  getMessagesForUser: (userId) => {
    const state = get();
    return state.messageCache[userId]?.messages || [];
  },

  getCacheForUser: (userId) => {
    const state = get();
    return state.messageCache[userId] || { messages: [], cursor: null, hasMore: true };
  },

  getPaginationForUser: (userId) => {
    const state = get();
    return state.paginationState[userId] || { cursor: null, hasMore: true, isLoading: false };
  },
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
