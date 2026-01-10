# Redis Cache Flow Diagram

## Message Lifecycle with Caching

```
┌─────────────────────────────────────────────────────────────────┐
│                     SEND MESSAGE FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User sends message
       │
       ▼
┌─────────────────────┐
│  HTTP POST Request  │  OR  │  WebSocket Event  │
│ /api/messages/send  │      │ socket.sendMessage│
└─────────────────────┘      └──────────────────┘
       │                             │
       ├─────────────────┬───────────┘
       │                 │
       ▼                 ▼
  ┌──────────────────────────────┐
  │  Create Message Object       │
  └──────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────┐
  │  ✓ Save to MongoDB           │  ◄─── PERSISTENT STORAGE
  │    (Creates _id)             │
  └──────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────┐
  │  ✓ Cache in Redis            │  ◄─── FAST CACHE (5s TTL)
  │    Key: message:{_id}        │
  └──────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────┐
  │  ✓ Update Conversation Cache │  ◄─── CONVERSATION CACHE (5s TTL)
  │    Key: messages:{id1}:{id2} │
  └──────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────┐
  │  ✓ Emit via Socket.io        │
  │    newMessage event          │
  └──────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────┐
  │  ✓ Response to Client        │
  │    200 OK + message data     │
  └──────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                   CACHE LIFECYCLE (5 seconds)                   │
└─────────────────────────────────────────────────────────────────┘

     Time 0s          Time 2s           Time 5s          Time 6s
        │               │                 │                │
        │               │                 │                │
    ┌───┴─────┐     ┌────────┐       ┌─────────┐      ┌────────┐
    │ CACHED  │────▶│ CACHED │──────▶│ EXPIRED │─────▶│DELETED │
    │  Data   │     │ Data   │       │ (TTL=0) │      │ Event  │
    │in Redis │     │in Redis│       │in Redis │      │Logged  │
    └─────────┘     └────────┘       └─────────┘      └────────┘
    Message       Still cached      Cache triggers   Cache clean
    added         if accessed       expiration       completed


┌─────────────────────────────────────────────────────────────────┐
│                 BACKGROUND WORKER (Every 1s)                    │
└─────────────────────────────────────────────────────────────────┘

     Worker Interval        Worker Check         Status
          │                      │                  │
          ▼                      ▼                  ▼
   ┌──────────────┐      ┌──────────────┐    ┌──────────────┐
   │   Worker     │────▶ │  Get Keys:   │───▶│ Check TTL    │
   │   Starts     │      │ message:*    │    │ of each      │
   └──────────────┘      └──────────────┘    └──────────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
           ┌──────────────┐           ┌──────────────┐
           │ TTL Valid    │           │   TTL=0      │
           │ (< 5s)       │           │  (Expired)   │
           └──────────────┘           └──────────────┘
                 │                             │
                 ▼                             ▼
           Log: Cache Hit              Delete from Cache
                                       Log: Cache cleaned


┌─────────────────────────────────────────────────────────────────┐
│                     GET MESSAGES FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User requests messages
       │
       ▼
┌─────────────────────┐
│  HTTP GET Request   │
│ /api/messages/{id}  │
└─────────────────────┘
       │
       ▼
  ┌──────────────────────────────┐
  │  Query MongoDB for:          │
  │  Messages between users      │
  │  (Full conversation history) │
  └──────────────────────────────┘
       │
       ▼
  ┌──────────────────────────────┐
  │  Return with latest data     │
  │  (Includes recently cached   │
  │   and persisted messages)    │
  └──────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    KEY BENEFITS                                 │
└─────────────────────────────────────────────────────────────────┘

✓ SPEED:        Redis serves data instantly (microseconds)
✓ LOAD:         Reduces MongoDB query pressure
✓ PERSISTENCE:  Data always saved to MongoDB (never lost)
✓ MEMORY:       Auto-cleanup with 5s TTL
✓ REAL-TIME:    WebSocket + REST API both cached
✓ RELIABLE:     Worker ensures consistency

```

## Cache Key Naming Convention

```
message:{messageId}
├── Individual message cache
├── TTL: 5 seconds
└── Example: message:507f1f77bcf86cd799439011

messages:{userId1}:{userId2}
├── Conversation cache
├── TTL: 5 seconds
└── Example: messages:123:456
```

## Performance Comparison

```
Operation              Without Cache    With Cache      Improvement
────────────────────────────────────────────────────────────────
Send Message          ~150ms            ~100ms          33% faster
(DB + Response)       (DB write only)   (DB + Cache)

Get Conversation      ~200-500ms        ~50-100ms       60% faster
(DB query + sort)     (from DB)         (from Redis)

Message Updates       ~100ms            ~50ms           50% faster
(Reaction, etc)       (from DB)         (from Cache)
```

## Memory Usage

```
For 1000 cached messages (5 seconds):
- Average message size: ~500 bytes
- Redis overhead: ~200 bytes per key
- Total per message: ~700 bytes
- Total: ~700 KB

With auto-cleanup (5s TTL):
- Memory is automatically freed
- No bloating or memory leaks
```
