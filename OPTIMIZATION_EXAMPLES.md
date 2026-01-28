# 📋 Implementation Examples & Integration Guide

## How to Use the New Optimization Tools

### 1. Using Zustand Store

#### Example: Managing Message Cache

```jsx
import { useChatStore, useMessagesForUser } from '../store/chatStore';

function ChatView({ user, currentUser }) {
  // Only re-render when messages for this user change
  const messages = useMessagesForUser(user._id);
  const { setMessageCache, addMessageToCache } = useChatStore();

  // On component mount - initialize cache
  useEffect(() => {
    if (user?._id) {
      fetchInitialMessages();
    }
  }, [user._id]);

  const fetchInitialMessages = async () => {
    const res = await axios.get(`/messages/${user._id}?limit=20`);
    // Store in Zustand
    setMessageCache(user._id, res.data.data, res.data.cursor, res.data.hasMore);
  };

  // On new message from socket
  useEffect(() => {
    socket.on('newMessage', (msg) => {
      if (msg.sender === user._id || msg.receiver === user._id) {
        // Add to store (triggers subscription update)
        addMessageToCache(user._id, msg);
      }
    });
    return () => socket.off('newMessage');
  }, [user._id]);

  return (
    <div>
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg._id}
          message={msg}
          previousMessage={messages[idx - 1]}
          currentUser={currentUser}
        />
      ))}
    </div>
  );
}
```

---

### 2. Using Memoized Message Component

#### Before (Causes re-renders)
```jsx
// In ChatView.jsx render
{messages.map((msg) => (
  <div key={msg._id} className={msg.sender === currentUser._id ? 'sent' : 'received'}>
    <img src={msg.sender.profilePicture} alt="" />
    <div>{msg.content}</div>
    <span>{msg.status}</span>
    {/* ... more JSX ... */}
  </div>
))}
```

#### After (Optimized)
```jsx
import { MessageBubble } from '../components/ChatMessageComponents';

{messages.map((msg, idx) => (
  <MessageBubble
    key={msg._id}
    message={msg}
    previousMessage={messages[idx - 1]}
    currentUser={currentUser}
    isGroupChat={Boolean(selectedGroup)}
    onReact={handleReact}
    onReply={(replyMsg) => setReplyingTo(replyMsg)}
    onShowReactions={(messageId) => setShowReactionPicker(messageId)}
    onLongPress={(messageId) => handleLongPress(messageId)}
    onDoubleTap={(messageId) => handleDoubleTap(messageId)}
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    showReactions={showReactionPicker}
    showLongPressReactions={showLongPressReactions}
    isMobile={isMobile}
  />
))}
```

**Result**: Each message component only re-renders when its own data changes, not when parent re-renders.

---

### 3. Using Optimized Sidebar

#### Before (Full list re-renders)
```jsx
function Sidebar({ users, selectedUser, onSelectUser }) {
  return (
    <div>
      {users.map(user => (
        <div key={user._id} onClick={() => onSelectUser(user)}>
          <img src={user.profilePicture} alt="" />
          <span>{user.name}</span>
          {/* ... */}
        </div>
      ))}
    </div>
  );
}
```

#### After (Optimized items)
```jsx
import { ChatItem } from '../components/SidebarComponents';

function Sidebar({ users, selectedUser, onSelectUser, unreadCounts, lastMessages }) {
  return (
    <div>
      {users.map(user => (
        <ChatItem
          key={user._id}
          user={user}
          isSelected={selectedUser?._id === user._id}
          isOnline={onlineUsers.includes(user._id)}
          unreadCount={unreadCounts[user._id] || 0}
          lastMessage={lastMessages[user._id]}
          lastSeen={formatLastSeen(user.lastSeen)}
          onClick={onSelectUser}
          settings={settings}
        />
      ))}
    </div>
  );
}
```

**Result**: Each chat item only re-renders if its specific data changes (unread count, last message, online status).

---

### 4. Using Throttled Typing

#### Before (Sends on every keystroke)
```jsx
const handleInputChange = (e) => {
  setInputValue(e.target.value);
  
  // Sends 10+ times per second!
  socket.emit('typing', {
    senderId: currentUser._id,
    receiverId: user._id,
  });
};
```

#### After (Throttled)
```jsx
import { useThrottledTyping } from '../hooks/useSocketOptimization';

function ChatView({ user, currentUser, socket }) {
  const { emitTyping, cleanup } = useThrottledTyping(socket, {
    userId: currentUser._id,
    recipientId: user._id,
    throttleMs: 500, // Max once per 500ms
    stopTypingDelayMs: 1000,
  });

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    emitTyping(); // Automatically throttled
  };

  useEffect(() => cleanup, []);

  return <input onChange={handleInputChange} />;
}
```

**Result**: Typing events: 10+/sec → 2/sec (80% reduction)

---

### 5. Using Batched Socket Events

#### Before (Individual emissions)
```jsx
// Mark 100 messages as read
messages.forEach(msg => {
  socket.emit('markRead', { messageId: msg._id }); // 100 emissions!
});
```

#### After (Batched)
```jsx
import { useBatchedSocketEvents } from '../hooks/useSocketOptimization';

function ChatView({ socket }) {
  const batcher = useBatchedSocketEvents(socket, { batchDelayMs: 1000 });

  const markMessagesAsRead = (messages) => {
    messages.forEach(msg => {
      batcher.batch('markRead', { messageId: msg._id });
    });
    // Automatically emits as: socket.emit('markRead', [msg1, msg2, ...])
  };
}
```

**Result**: 100 events → 1 batched event (99% reduction for this operation)

---

### 6. Using Message Reconciliation

#### Before (Optimistic then duplicate)
```jsx
// Send message optimistically
const optimisticMsg = { id: 'temp1', content: 'Hello', status: 'sending' };
setMessages([...messages, optimisticMsg]);

// Real message arrives - adds duplicate
socket.on('newMessage', (realMsg) => {
  setMessages(prev => [...prev, realMsg]); // Now have both temp and real!
});
```

#### After (Automatic reconciliation)
```jsx
import { useMessageReconciliation } from '../hooks/useSocketOptimization';

function ChatView() {
  const reconcile = useMessageReconciliation(messages, setMessages);

  const sendMessage = (content) => {
    // Send with tempId
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      tempId,
      content,
      status: 'sending',
      sender: currentUser._id,
      receiver: user._id,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    
    socket.emit('sendMessage', { content, tempId });
  };

  // When real message arrives
  useEffect(() => {
    socket.on('newMessage', (realMsg) => {
      reconcile(realMsg); // Automatically matches by tempId, no duplicates
    });
  }, []);
}
```

**Result**: No ghost messages, instant feedback, automatic cleanup.

---

### 7. Using Performance Utilities

#### Throttle - Limit function calls
```jsx
import { throttle } from '../lib/performance';

// Throttle scroll handler - max once per 100ms
const handleScroll = throttle((e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  
  if (scrollTop === 0) {
    loadOlderMessages(); // Won't call more than once per 100ms
  }
}, 100);

<div onScroll={handleScroll}>
  {/* ... */}
</div>
```

#### Debounce - Wait for pause
```jsx
import { debounce } from '../lib/performance';

// Wait 300ms after user stops typing to search
const debouncedSearch = debounce((query) => {
  fetchSearchResults(query);
}, 300);

const handleSearchChange = (e) => {
  setSearchQuery(e.target.value);
  debouncedSearch(e.target.value); // Won't call until 300ms after last keystroke
};
```

#### LRU Cache - Auto-evict old items
```jsx
import { LRUCache } from '../lib/performance';

const messageCache = new LRUCache(100); // Keep max 100 messages

const fetchMessage = async (messageId) => {
  // Check cache first
  if (messageCache.has(messageId)) {
    return messageCache.get(messageId);
  }

  // Fetch from API
  const msg = await axios.get(`/messages/${messageId}`);
  messageCache.set(messageId, msg);
  return msg;
};
```

#### Message Deduplicator - Prevent duplicates
```jsx
import { MessageDeduplicator } from '../lib/performance';

const deduplicator = new MessageDeduplicator(1000);

socket.on('newMessage', (msg) => {
  if (deduplicator.add(msg._id, msg.tempId)) {
    // New message - add to list
    setMessages(prev => [...prev, msg]);
  } else {
    // Duplicate - ignore
    console.log('Duplicate ignored');
  }
});
```

---

### 8. Lazy Loading Images

#### Basic Lazy Loading
```jsx
import { Avatar } from '../components/ChatMessageComponents';

// Avatars load only when visible
<Avatar
  src={user.profilePicture}
  alt={user.name}
  size={48}
  fallback={<FaCircleUser />}
/>
```

#### With Intersection Observer
```jsx
import { useLazyAvatar } from '../hooks/useSocketOptimization';

function LazyAvatar({ src, alt }) {
  const imgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useLazyAvatar(imgRef, () => setIsVisible(true));

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : undefined}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}
```

---

### 9. Handling Large Emoji Picker

#### Before (Always in DOM)
```jsx
{showEmoji && (
  <EmojiPicker onEmojiClick={handleEmojiClick} />
)}
```

#### After (Lazy load)
```jsx
import { lazy, Suspense } from 'react';

const LazyEmojiPicker = lazy(() => 
  import('emoji-picker-react').then(m => ({ default: m.EmojiPicker }))
);

{showEmoji && (
  <Suspense fallback={<div>Loading emoji...</div>}>
    <LazyEmojiPicker onEmojiClick={handleEmojiClick} />
  </Suspense>
)}
```

---

### 10. Scroll Preservation with Pagination

```jsx
import { useScrollPreservation } from '../hooks/useSocketOptimization';

function ChatView({ user }) {
  const containerRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const { handleScroll, preserveScroll } = useScrollPreservation(
    containerRef,
    loadOlderMessages
  );

  const loadOlderMessages = useCallback(async () => {
    preserveScroll(async () => {
      const olderMessages = await fetchOlderMessages();
      setMessages(prev => [...olderMessages, ...prev]);
    });
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="messages-container"
    >
      {messages.map(msg => (
        <MessageBubble key={msg._id} message={msg} />
      ))}
    </div>
  );
}
```

---

## 🔄 Complete Example: Optimized Chat

```jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore, useMessagesForUser } from '../store/chatStore';
import { MessageBubble } from '../components/ChatMessageComponents';
import { useThrottledTyping, useScrollPreservation } from '../hooks/useSocketOptimization';

function OptimizedChat({ user, currentUser, socket }) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  
  // Zustand state - only updates on relevant changes
  const messages = useMessagesForUser(user._id);
  const { setMessageCache, addMessageToCache, reconcileOptimisticMessage } = useChatStore();

  // Local state - minimal
  const [inputValue, setInputValue] = useState('');
  const [selectedReaction, setSelectedReaction] = useState(null);

  // Optimized hooks
  const { emitTyping } = useThrottledTyping(socket, {
    userId: currentUser._id,
    recipientId: user._id,
    throttleMs: 500,
  });

  const { handleScroll, preserveScroll } = useScrollPreservation(
    containerRef,
    loadOlderMessages
  );

  // Fetch initial messages
  useEffect(() => {
    setMessageCache(user._id, [], null, true);
    fetchInitialMessages();
  }, [user._id]);

  const fetchInitialMessages = useCallback(async () => {
    try {
      const res = await axios.get(`/messages/${user._id}?limit=20`);
      setMessageCache(user._id, res.data.data, res.data.cursor, res.data.hasMore);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [user._id, setMessageCache]);

  // Load older messages
  const loadOlderMessages = useCallback(async () => {
    const { cursor, hasMore } = useChatStore.getState().getPaginationForUser(user._id);
    if (!hasMore || !cursor) return;

    await preserveScroll(async () => {
      try {
        const res = await axios.get(`/messages/${user._id}?cursor=${cursor}&limit=20`);
        useChatStore.getState().prependMessagesToCache(
          user._id,
          res.data.data,
          res.data.cursor,
          res.data.hasMore
        );
      } catch (error) {
        console.error('Failed to load older messages:', error);
      }
    });
  }, [user._id, preserveScroll]);

  // Socket listeners
  useEffect(() => {
    socket?.on('newMessage', (msg) => {
      if (msg.sender === user._id || msg.receiver === user._id) {
        reconcileOptimisticMessage(user._id, msg);
      }
    });

    return () => socket?.off('newMessage');
  }, [user._id, socket, reconcileOptimisticMessage]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      tempId,
      content: inputValue,
      status: 'sending',
      sender: currentUser._id,
      receiver: user._id,
      createdAt: new Date().toISOString(),
    };

    // Add optimistically
    addMessageToCache(user._id, optimisticMsg);
    setInputValue('');

    try {
      const res = await axios.post('/messages/send', {
        receiver: user._id,
        content: inputValue,
        tempId,
      });

      // Reconcile when real message arrives
      reconcileOptimisticMessage(user._id, res.data.message);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Rollback on error
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
    }
  }, [inputValue, currentUser, user, addMessageToCache, reconcileOptimisticMessage]);

  // Input change
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
    if (e.target.value.length > 0) {
      emitTyping(); // Throttled
    }
  }, [emitTyping]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            previousMessage={messages[idx - 1]}
            currentUser={currentUser}
            isMobile={window.innerWidth < 768}
          />
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="w-full p-2 border border-gray-600 rounded bg-gray-800 text-white"
        />
        <button
          onClick={handleSend}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default OptimizedChat;
```

---

## ✅ Verification

After implementing, you should see:

✅ No console warnings about missing dependencies  
✅ Smooth scrolling even with 1000+ messages  
✅ Input responds instantly to typing  
✅ Avatars appear as you scroll  
✅ DevTools Profiler shows fewer re-renders  
✅ Network tab shows fewer socket events  
✅ Memory usage remains stable  

---

## 🐛 Debug Mode

Enable console logging for optimization insights:

```javascript
// At top of file
const DEBUG = true;
const log = (msg, data) => DEBUG && console.log(`[OPT] ${msg}`, data);

// Use throughout
log('Message rendered', msg._id);
log('Socket event throttled', event);
log('Cache hit', cacheKey);
```

---

This completes your performance optimization framework!
Start with Phase 1 (Zustand + Memoized Components) for maximum impact.
