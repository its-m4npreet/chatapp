# Duplicate Message Fix Guide

## Problem
Messages showing as both "sending" and "sent" status simultaneously in the chat.

## Root Cause
Socket events and local state updates are not properly reconciling optimistic messages with real ones.

## Solution

### 1. **Use Store-Based Deduplication** (Recommended)

In your ChatView.jsx, when handling socket events:

```javascript
import { useChatStore } from '../store/chatStore';

function ChatView({ chatId }) {
  const { reconcileOptimisticMessage, removeDuplicateMessages } = useChatStore();
  
  // When message comes from socket
  useEffect(() => {
    socket.on('newMessage', (message) => {
      // Use reconciliation instead of just adding
      reconcileOptimisticMessage(chatId, message);
      
      // Optional: Run deduplication every time to be safe
      removeDuplicateMessages(chatId);
    });
    
    return () => socket.off('newMessage');
  }, [socket, chatId]);
}
```

### 2. **Ensure Optimistic Messages Have tempId**

When sending a message, create it with a tempId:

```javascript
const sendMessage = async (content) => {
  const tempId = `temp_${Date.now()}_${Math.random()}`;
  
  // Add optimistic message
  const optimisticMsg = {
    _id: tempId,  // Use tempId as _id initially
    tempId,       // Keep tempId for reconciliation
    content,
    status: 'sending',
    sender: currentUserId,
    createdAt: new Date(),
  };
  
  addMessageToCache(chatId, optimisticMsg);
  
  try {
    const response = await api.sendMessage({ content });
    // Use reconciliation to replace optimistic with real message
    reconcileOptimisticMessage(chatId, response.data);
  } catch (error) {
    console.error('Send failed:', error);
  }
};
```

### 3. **Use the New Deduplication Hook**

If using local useState instead of store:

```javascript
import { useDeduplicateMessages } from '../hooks/useSocketOptimization';

function ChatView() {
  const [messages, setMessages] = useState([]);
  const deduplicate = useDeduplicateMessages(messages);
  
  // After any message addition/update
  useEffect(() => {
    const deduped = deduplicate();
    if (deduped.length !== messages.length) {
      setMessages(deduped);
    }
  }, [messages, deduplicate]);
}
```

### 4. **Use removeDuplicateMessages After Socket Events**

```javascript
// In ChatView socket event handlers
socket.on('newMessage', (message) => {
  // First reconcile
  reconcileOptimisticMessage(chatId, message);
  
  // Then clean up any remaining duplicates
  removeDuplicateMessages(chatId);
});

socket.on('messageRead', (messageId) => {
  updateMessageStatus(chatId, messageId, 'read');
  removeDuplicateMessages(chatId);
});
```

## Complete Example

```javascript
import React, { useEffect, useState } from 'react';
import { useChatStore } from '../store/chatStore';

function ChatView({ chatId, socket }) {
  const {
    addMessageToCache,
    reconcileOptimisticMessage,
    removeDuplicateMessages,
    getMessagesForUser,
  } = useChatStore();

  const messages = getMessagesForUser(chatId);

  // Handle incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Reconcile optimistic message
      reconcileOptimisticMessage(chatId, message);
      // Remove any remaining duplicates
      removeDuplicateMessages(chatId);
    };

    const handleTyping = (data) => {
      // ... handle typing
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket, chatId, reconcileOptimisticMessage, removeDuplicateMessages]);

  // Send message with optimistic update
  const handleSendMessage = async (content) => {
    const tempId = `temp_${Date.now()}`;
    
    const optimisticMessage = {
      _id: tempId,
      tempId,
      content,
      status: 'sending',
      sender: currentUserId,
      createdAt: new Date(),
    };

    // Show immediately (optimistic)
    addMessageToCache(chatId, optimisticMessage);

    try {
      const response = await api.sendMessage({ chatId, content });
      // Replace optimistic with real message
      reconcileOptimisticMessage(chatId, response.data);
    } catch (error) {
      console.error('Failed to send:', error);
      // Could remove optimistic message here on error
    }
  };

  return (
    <div className="chat-view">
      {messages.map((msg) => (
        <MessageBubble
          key={msg._id || msg.tempId}
          message={msg}
          // ... other props
        />
      ))}
      {/* ... rest of component */}
    </div>
  );
}

export default ChatView;
```

## What Each Method Does

| Method | Purpose | When to Use |
|--------|---------|------------|
| `addMessageToCache` | Add message without checking | First message addition |
| `reconcileOptimisticMessage` | Replace optimistic with real message | Socket 'newMessage' event |
| `removeDuplicateMessages` | Aggressively remove all duplicates | After any update |
| `useDeduplicateMessages` hook | Filter duplicates from array | Local useState approach |

## Testing

1. **Send a message** - Should show as "sending"
2. **Socket receives it** - Should update to "sent" (not duplicate)
3. **Check console** - No duplicate warnings
4. **Reload page** - No duplicate history

## Performance Impact

- ✅ Minimal - deduplication is O(n) with Map
- ✅ Only runs when needed
- ✅ No network overhead

## Key Points

1. **Always use tempId** - Makes reconciliation possible
2. **Call reconciliation** - Don't just add socket messages
3. **Use store methods** - They handle deduplication automatically
4. **Test on slow networks** - Where duplicates are most visible
