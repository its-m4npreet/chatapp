# 🛠️ Backend Performance Optimization Guide

## Overview

High-level backend optimizations to support the frontend improvements and handle large-scale group chats efficiently.

---

## 🎯 Priority Optimizations

### 1. Database Indexing (CRITICAL)

**File**: `backend/model/*.js`

#### Message Model
```javascript
// backend/model/message.js
const messageSchema = new Schema({
  sender: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group', index: true },
  content: String,
  messageType: { type: String, enum: ['text', 'image', 'audio', 'mixed'], index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sending', 'sent', 'delivered', 'read'] },
}, { timestamps: true });

// Add compound indexes for common queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, status: 1 }); // For unread counts
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // TTL: 90 days
```

#### Chat (DM) Model
```javascript
// If using a separate Chat model for DM metadata
const chatSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  unreadCounts: Map, // { userId -> count }
}, { timestamps: true });

chatSchema.index({ participants: 1, lastMessageAt: -1 });
```

#### Group Model
```javascript
// backend/model/group.js
const groupSchema = new Schema({
  name: { type: String, index: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  admin: { type: Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

groupSchema.index({ members: 1, lastMessageAt: -1 });
groupSchema.index({ admin: 1, createdAt: -1 });
```

#### User Model
```javascript
// backend/model/user.js
const userSchema = new Schema({
  name: { type: String, index: true },
  email: { type: String, unique: true, index: true },
  lastSeen: { type: Date, default: Date.now, index: true },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
}, { timestamps: true });

userSchema.index({ email: 1, lastSeen: -1 });
```

**Expected Impact**:
- ✅ Query time: 500ms → 10-50ms
- ✅ Unread count fetch: 5s → 100ms
- ✅ Message list: 2s → 200ms

---

### 2. Cursor-Based Pagination (CRITICAL)

**Current Problem**: Offset-based pagination (`skip().limit()`) gets slower with large datasets.

**Solution**: Cursor-based pagination

#### Controller Implementation
```javascript
// backend/controllers/message.controller.js

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { cursor, limit = 20 } = req.query;
    const currentUser = req.user._id;

    // Build query
    const query = {
      $or: [
        { sender: currentUser, receiver: userId },
        { sender: userId, receiver: currentUser }
      ]
    };

    // Cursor handling (for older messages)
    let sort = { createdAt: -1 }; // Newest first
    if (cursor) {
      // Find the cursor message to get its timestamp
      const cursorMessage = await Message.findById(cursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
        // Or use _id for tighter control:
        // query._id = { $lt: mongoose.Types.ObjectId(cursor) };
      }
    }

    // Fetch limit + 1 to check if there are more
    const messages = await Message
      .find(query)
      .select('_id sender receiver content messageType image audio createdAt status reactions')
      .populate('sender', 'name profilePicture _id')
      .populate('receiver', 'name profilePicture _id')
      .populate('replyTo', 'content sender')
      .sort(sort)
      .limit(limit + 1)
      .lean(); // Return plain objects, not mongoose docs

    const hasMore = messages.length > limit;
    const paginatedMessages = messages.slice(0, limit);
    const newCursor = paginatedMessages.length > 0
      ? paginatedMessages[paginatedMessages.length - 1]._id
      : null;

    res.json({
      data: paginatedMessages,
      cursor: newCursor,
      hasMore,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Group messages endpoint
exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { cursor, limit = 20 } = req.query;

    const query = { group: groupId };

    if (cursor) {
      const cursorMessage = await Message.findById(cursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    const messages = await Message
      .find(query)
      .select('_id sender content messageType image audio createdAt status reactions group')
      .populate('sender', 'name profilePicture _id')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const paginatedMessages = messages.slice(0, limit);
    const newCursor = paginatedMessages.length > 0
      ? paginatedMessages[paginatedMessages.length - 1]._id
      : null;

    res.json({
      data: paginatedMessages,
      cursor: newCursor,
      hasMore,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Benefits**:
- ✅ Constant time complexity: O(n) for any page
- ✅ No skip overhead
- ✅ Better with real-time updates

---

### 3. Redis Caching

**File**: `backend/config/redis.js` + controllers

#### Cache Strategy
```javascript
// backend/config/redis.js
const redis = require('redis');
const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

client.connect();

module.exports = client;

// Usage in controllers
// backend/controllers/message.controller.js

const redis = require('../config/redis');

// Cache unread counts
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `unreadCount:${userId}`;

    // Check cache first
    const cachedCount = await redis.get(cacheKey);
    if (cachedCount !== null) {
      return res.json({ unreadCount: parseInt(cachedCount) });
    }

    // Query if not cached
    const count = await Message.countDocuments({
      receiver: userId,
      status: { $ne: 'read' }
    });

    // Cache for 1 hour
    await redis.setEx(cacheKey, 3600, count.toString());

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cache last messages
exports.getLastMessageForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user._id;
    const cacheKey = `lastMsg:${currentUser}:${userId}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ lastMessage: JSON.parse(cached) });
    }

    // Query
    const lastMessage = await Message
      .findOne({
        $or: [
          { sender: currentUser, receiver: userId },
          { sender: userId, receiver: currentUser }
        ]
      })
      .sort({ createdAt: -1 })
      .select('content messageType image audio createdAt sender receiver')
      .lean();

    if (lastMessage) {
      // Cache for 1 hour
      await redis.setEx(cacheKey, 3600, JSON.stringify(lastMessage));
    }

    res.json({ lastMessage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cache invalidation on new message
exports.sendMessage = async (req, res) => {
  // ... save message ...

  // Invalidate related caches
  const receiverId = req.body.receiver;
  await redis.del(`lastMsg:${req.user._id}:${receiverId}`);
  await redis.del(`lastMsg:${receiverId}:${req.user._id}`);
  await redis.del(`unreadCount:${receiverId}`);

  // ... emit socket event ...
};
```

**Cache Keys Pattern**:
```
unreadCount:{userId}           -> Total unread for user
lastMsg:{userId1}:{userId2}    -> Last message in DM
lastMsg:group:{groupId}        -> Last group message
typingIndicator:{groupId}      -> Active typers in group
onlineUsers                    -> Set of online user IDs
```

**Expected Impact**:
- ✅ Unread count: 500ms → 10ms (first time), <1ms cached
- ✅ Last messages list: 5s (for 100 chats) → 100ms
- ✅ Reduced DB load: 70-80%

---

### 4. Efficient Group Read Receipts

**Problem**: Emitting read receipts for every message = N² events

**Solution**: Batch and cleanup

```javascript
// backend/controllers/message.controller.js

// Mark multiple messages as read in one call
exports.markGroupMessagesAsRead = async (req, res) => {
  try {
    const { groupId, messageIds } = req.body;
    const userId = req.user._id;

    // Batch update instead of per-message
    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        group: groupId,
        receiver: userId,
        status: { $ne: 'read' }
      },
      {
        status: 'read',
        readBy: userId,
        readAt: new Date()
      }
    );

    // Emit single socket event with batch
    req.io.to(groupId).emit('messagesReadBatch', {
      userId,
      messageIds,
      readAt: new Date()
    });

    res.json({ updatedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Expected Impact**:
- ✅ Read receipt events: 100/message → 1/batch
- ✅ Network: 100MB/day → 10MB/day in large groups

---

### 5. Socket.io Room Optimization

**File**: `backend/index.js` (socket setup)

```javascript
const io = require('socket.io')(server, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

// Use rooms for group messages
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`); // Personal room
    socket.userId = userId;
  });

  socket.on('joinGroup', (groupId) => {
    socket.join(`group:${groupId}`); // Group room
  });

  socket.on('leaveGroup', (groupId) => {
    socket.leave(`group:${groupId}`);
  });

  // Emit only to relevant room
  socket.on('newMessage', (message) => {
    if (message.group) {
      // Group message - emit to group room only
      io.to(`group:${message.group}`).emit('newMessage', message);
    } else {
      // DM - emit to receiver's personal room
      io.to(`user:${message.receiver}`).emit('newMessage', message);
      // Optionally: emit to sender's other devices
      io.to(`user:${message.sender}`).emit('newMessage', message);
    }
  });

  socket.on('typing', ({ groupId, senderId }) => {
    if (groupId) {
      // Only emit to group members, not sender
      socket.to(`group:${groupId}`).emit('userTyping', {
        senderId,
        groupId
      });
    }
  });
});
```

**Expected Impact**:
- ✅ Message broadcast: All users → relevant users only
- ✅ Server CPU: 80% reduction in large groups
- ✅ Network per message: 1MB × users → 1MB

---

### 6. Lazy Populate & Projection

**Concept**: Only fetch fields you need

```javascript
// BAD - fetches everything
const messages = await Message.find(query).populate('sender');

// GOOD - select specific fields
const messages = await Message
  .find(query)
  .select('_id sender content createdAt status')
  .populate('sender', 'name profilePicture _id')
  .lean() // Convert to plain objects (20% faster)
  .limit(20);
```

**Expected Impact**:
- ✅ Document size: 2KB → 500 bytes
- ✅ Network per fetch: 40KB → 10KB
- ✅ Memory: 10MB → 2MB for 5000 documents

---

### 7. Aggregation Pipeline for Analytics

**For group chat activity**:
```javascript
// backend/controllers/group.controller.js

exports.getGroupStats = async (req, res) => {
  try {
    const { groupId } = req.params;

    const stats = await Message.aggregate([
      { $match: { group: groupId } },
      {
        $facet: {
          totalMessages: [
            { $count: 'count' }
          ],
          topSenders: [
            { $group: { _id: '$sender', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
          ],
          messagesByDay: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: -1 } },
            { $limit: 30 }
          ]
        }
      }
    ]);

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 📊 Performance Checklist

### Database
- [ ] Indexes on: sender, receiver, group, createdAt
- [ ] Compound indexes: (sender, receiver, createdAt)
- [ ] TTL index on messages (optional, for auto-cleanup)
- [ ] `.lean()` on read-only queries
- [ ] Projection in `.select()`

### API
- [ ] Cursor-based pagination
- [ ] Redis caching for frequent queries
- [ ] Batch operations (read receipts, updates)
- [ ] Lazy populate (only needed fields)
- [ ] Gzip compression enabled

### Socket.io
- [ ] Rooms for groups (not broadcast all)
- [ ] User-specific rooms for DMs
- [ ] Avoid emitting to all users
- [ ] Throttle events on server side too
- [ ] Clean up disconnected sockets

### Monitoring
- [ ] Database slow query log
- [ ] Redis memory usage
- [ ] Socket connections count
- [ ] API response time percentiles (p50, p95, p99)
- [ ] Error rate tracking

---

## 🚀 Load Testing

### Test Scenario: 1000 users, 100 groups

```bash
# Using autocannon or Apache Bench
# Simulate message load
ab -n 10000 -c 100 http://localhost:5000/messages/user123

# Monitor during test:
# - DB connection pool
# - Redis memory
# - Node CPU
# - Socket connections
```

---

## 🔧 Environment Variables

```env
# backend/.env
MONGODB_URI=mongodb://user:pass@host:27017/chatapp
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# Connection pooling
MONGOOSE_POOL_SIZE=10
MONGOOSE_POOL_TIMEOUT=1000

# Socket.io
SOCKET_PING_INTERVAL=25000
SOCKET_PING_TIMEOUT=60000
```

---

## 📈 Scaling Strategy

### Phase 1: Single Server
- Redis cache locally
- MongoDB on same/adjacent server
- Suitable for: 1K-10K users

### Phase 2: Horizontal Scaling
- Redis cluster or managed service
- MongoDB replica set
- Socket.io adapter (redis-adapter)
- Load balancer (nginx/HAProxy)
- Suitable for: 10K-100K users

### Phase 3: Microservices
- Separate chat service
- Notification service
- Analytics service
- Message queue (RabbitMQ/Kafka)
- Suitable for: 100K+ users

---

## 🔍 Query Optimization Examples

### BEFORE (Slow)
```javascript
// N+1 problem
const chats = await Chat.find();
for (let chat of chats) {
  const lastMsg = await Message.findOne({...}); // N queries!
}
```

### AFTER (Fast)
```javascript
// Single aggregation
const chats = await Chat.aggregate([
  {
    $lookup: {
      from: 'messages',
      let: { chatId: '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$chat', '$$chatId'] } } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 }
      ],
      as: 'lastMessage'
    }
  },
  {
    $unwind: '$lastMessage'
  }
]);
```

---

## 💾 Database Maintenance

```javascript
// Run weekly to clean old messages
db.messages.deleteMany({ createdAt: { $lt: new Date(Date.now() - 90*24*60*60*1000) } });

// Rebuild indexes
db.messages.reIndex();

// Check index usage
db.messages.aggregate([{ $indexStats: {} }]);
```

---

## Summary

**Quick Wins** (Implement First):
1. ✅ Add database indexes (10-50x speedup)
2. ✅ Implement cursor pagination (linear instead of exponential)
3. ✅ Add Redis caching (eliminate redundant DB queries)
4. ✅ Use Socket.io rooms (broadcast to relevant users only)

**Medium Effort** (Next Phase):
5. ✅ Batch operations (read receipts, updates)
6. ✅ Query projection (reduce network payload)
7. ✅ Aggregation pipelines (efficient analytics)

**Long Term** (As You Scale):
8. ✅ Database replication (read replicas)
9. ✅ Redis clustering
10. ✅ Message queue for async processing

---

**Expected Results After Optimization**:
- 📊 Database latency: 500ms → 10-50ms (50x)
- 🔄 Pagination: Linear time (any page equally fast)
- 💰 Server load: 60-80% reduction
- 📱 Mobile UX: Immediate feedback (from cache)
- 👥 Scalability: 10x-100x more concurrent users
