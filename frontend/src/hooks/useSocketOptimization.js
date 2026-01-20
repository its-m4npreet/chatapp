import React, { useEffect, useRef, useCallback } from 'react';
import { SocketEventBatcher } from '../lib/performance';

/**
 * Hook for efficient socket event listeners
 * Auto-cleanup and prevents duplicate listeners
 */
export const useSocketListener = (socket, eventName, handler, dependencies = []) => {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;

    const wrappedHandler = (...args) => handlerRef.current(...args);
    socket.on(eventName, wrappedHandler);

    return () => {
      socket.off(eventName, wrappedHandler);
    };
  }, [socket, eventName, dependencies]);
};

/**
 * Hook for throttled typing indicators
 * Prevents excessive socket emissions
 */
export const useThrottledTyping = (socket, options = {}) => {
  const {
    throttleMs = 500,
    stopTypingDelayMs = 1000,
    userId,
    recipientId,
  } = options;

  const typingTimeoutRef = useRef(null);
  const lastEmitRef = useRef(0);

  const emitTyping = useCallback(() => {
    if (!socket || !userId || !recipientId) return;

    const now = Date.now();
    if (now - lastEmitRef.current >= throttleMs) {
      lastEmitRef.current = now;
      socket.emit('typing', {
        senderId: userId,
        receiverId: recipientId,
      });
    }

    // Set timeout to stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', {
        senderId: userId,
        receiverId: recipientId,
      });
      typingTimeoutRef.current = null;
    }, stopTypingDelayMs);
  }, [socket, userId, recipientId, throttleMs, stopTypingDelayMs]);

  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  return { emitTyping, cleanup };
};

/**
 * Hook for efficient input event handling
 * Updates input immediately (no debounce) for instant feedback
 * Only throttles/debounces socket events (typing indicators)
 */
export const useInputHandler = (onInputChange, onTyping, options = {}) => {
  const {
    typingThrottleMs = 500,
    enableTyping = true,
  } = options;

  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      
      // Update input value IMMEDIATELY (no debounce)
      onInputChange?.(value);

      // Throttle typing indicator emission
      if (enableTyping && value.length > 0) {
        const now = Date.now();
        if (now - lastTypingEmitRef.current >= typingThrottleMs) {
          lastTypingEmitRef.current = now;
          onTyping?.();
        } else {
          // Schedule typing event if not already scheduled
          if (!typingTimeoutRef.current) {
            typingTimeoutRef.current = setTimeout(() => {
              lastTypingEmitRef.current = Date.now();
              onTyping?.();
              typingTimeoutRef.current = null;
            }, typingThrottleMs - (now - lastTypingEmitRef.current));
          }
        }
      } else if (value.length === 0 && typingTimeoutRef.current) {
        // Clear typing timer if input is empty
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    },
    [onInputChange, onTyping, typingThrottleMs, enableTyping]
  );

  return handleChange;
};

/**
 * Hook for optimized typing indicator
 * Throttles typing events to prevent socket spam
 */
export const useTypingIndicator = (onTyping, throttleMs = 500) => {
  const lastEmitRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  const emitTyping = useCallback(() => {
    const now = Date.now();

    // Clear any pending timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit if enough time has passed
    if (now - lastEmitRef.current >= throttleMs) {
      lastEmitRef.current = now;
      onTyping?.();
    } else {
      // Schedule emission for later
      typingTimeoutRef.current = setTimeout(() => {
        lastEmitRef.current = Date.now();
        onTyping?.();
        typingTimeoutRef.current = null;
      }, throttleMs - (now - lastEmitRef.current));
    }
  }, [onTyping, throttleMs]);

  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  return { emitTyping, cleanup };
};

/**
 * Reduces number of socket emissions for high-frequency events
 */
export const useBatchedSocketEvents = (socket, options = {}) => {
  const {
    batchDelayMs = 1000,
  } = options;

  const batcherRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    batcherRef.current = new SocketEventBatcher(socket, batchDelayMs);

    return () => {
      batcherRef.current?.flush();
      batcherRef.current = null;
    };
  }, [socket, batchDelayMs]);

  // Create wrapper object that returns batcher without accessing ref during render
  return {
    batch: (eventName, data) => batcherRef.current?.batch(eventName, data),
    flush: () => batcherRef.current?.flush(),
  };
};

/**
 * Hook for message reconciliation
 * Handles converting optimistic messages to real ones and removing duplicates
 * ONLY matches by tempId - no fuzzy matching (prevents false positives)
 */
export const useMessageReconciliation = (messages, setMessages) => {
  const reconcile = useCallback((incomingMessage) => {
    setMessages((prev) => {
      // Filter - ONLY remove if exact tempId match
      const filtered = prev.filter((msg) => {
        // ONLY remove if incoming has tempId and matches this message
        if (incomingMessage.tempId && msg.tempId === incomingMessage.tempId && msg._id !== incomingMessage._id) {
          return false;
        }
        // Keep everything else - NO fuzzy matching
        return true;
      });

      // Check if message already exists by _id
      const messageExists = filtered.some((m) => m._id === incomingMessage._id);
      if (messageExists) {
        // Update existing message
        return filtered.map((m) =>
          m._id === incomingMessage._id ? incomingMessage : m
        );
      }

      // Add as new message
      return [...filtered, incomingMessage];
    });
  }, [setMessages]);

  return reconcile;
};

/**
 * Hook for scroll position preservation during pagination
 */
export const useScrollPreservation = (containerRef, onLoadMore) => {
  const previousHeightRef = useRef(null);

  const handleScroll = useCallback(
    (e) => {
      const container = e.target;

      // Check if scrolled to top (for loading older messages)
      if (container.scrollTop === 0) {
        onLoadMore?.();
      }

      // Check if scrolled to bottom
      if (
        container.scrollHeight - container.scrollTop ===
        container.clientHeight
      ) {
        // Auto-scroll to bottom on new messages
      }
    },
    [onLoadMore]
  );

  const preserveScroll = useCallback(async (callback) => {
    if (!containerRef.current) return;

    // Store current scroll height
    previousHeightRef.current = containerRef.current.scrollHeight;

    // Execute callback
    if (callback) {
      await callback();
    }

    // Restore scroll position
    setTimeout(() => {
      if (containerRef.current && previousHeightRef.current) {
        const heightDiff =
          containerRef.current.scrollHeight - previousHeightRef.current;
        containerRef.current.scrollTop += heightDiff;
      }
    }, 0);
  }, [containerRef]);

  return { handleScroll, preserveScroll };
};

/**
 * Hook for efficient message filtering and sorting
 * Uses useMemo to prevent unnecessary recalculations
 */
export const useFilteredMessages = (messages, filter = {}) => {
  return messages.filter((msg) => {
    if (filter.senderId && msg.sender !== filter.senderId) return false;
    if (filter.type && msg.messageType !== filter.type) return false;
    if (filter.searchText) {
      return (msg.content || '').toLowerCase().includes(
        filter.searchText.toLowerCase()
      );
    }
    return true;
  });
};

/**
 * Hook for avatar lazy loading with intersection observer
 */
export const useLazyAvatar = (ref, onVisible) => {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onVisible?.();
        observer.unobserve(entry.target);
      }
    }, {
      rootMargin: '50px',
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, onVisible]);
};

/**
 * Hook for managing UI state (emoji picker, reactions) efficiently
 * Ensures only one picker is open at a time
 */
export const useUIStateManager = () => {
  const [state, setState] = React.useState({
    showEmojiPicker: false,
    showReactionPicker: null,
    showLongPressReactions: null,
  });

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const closeAll = useCallback(() => {
    setState({
      showEmojiPicker: false,
      showReactionPicker: null,
      showLongPressReactions: null,
    });
  }, []);

  return {
    state,
    setState: updateState,
    closeAll,
  };
};

/**
 * Hook for managing connection state
 */
export const useSocketConnection = (socket) => {
  const [isConnected, setIsConnected] = React.useState(socket?.connected || false);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return isConnected;
};

/**
 * Hook to deduplicate messages in chat
 * Call this after adding/updating messages to remove duplicates
 */
export const useDeduplicateMessages = (messages) => {
  return useCallback(() => {
    if (!Array.isArray(messages) || messages.length === 0) return messages;

    const seen = new Map(); // key -> latest message
    
    for (const msg of messages) {
      // Try to match by _id first (most reliable)
      if (msg._id) {
        const existing = seen.get(msg._id);
        // Keep the one with "sent" status over "sending"
        if (!existing || (msg.status === 'sent' && existing.status === 'sending')) {
          seen.set(msg._id, msg);
        }
      }
      // Also check for tempId matches
      else if (msg.tempId) {
        seen.set(msg.tempId, msg);
      }
      // Fallback to content-based dedup
      else {
        const key = `${msg.content}-${msg.sender}`;
        seen.set(key, msg);
      }
    }

    return Array.from(seen.values());
  }, [messages]);
};
