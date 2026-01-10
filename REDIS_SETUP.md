# Redis Caching Implementation Guide

## Overview
This setup implements Redis caching for fast data access with automatic persistence to MongoDB. Data is cached for a configurable TTL (default 5 seconds), then automatically persisted to MongoDB and removed from cache.

## Architecture
```
Message Created
    ↓
MongoDB (Saved)
    ↓
Redis Cache (5 second TTL)
    ↓
Cache Persistence Worker (monitors cache)
    ↓
After 5 seconds → Data removed from Redis
```

## Installation

### 1. Install Redis Package
```bash
cd backend
npm install
```

The `redis` package has already been added to `package.json`.

### 2. Install Redis Server

**On Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**On macOS (with Homebrew):**
```bash
brew install redis
brew services start redis
```

**Using Docker:**
```bash
docker run -d -p 6379:6379 redis:latest
```

### 3. Configure Environment Variables
Add these to your `.env` file in the backend folder:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password
```

## How It Works

### 1. **Cache Service** (`services/cacheService.js`)
Provides methods for:
- `setCache(key, data, ttl)` - Store data in Redis with TTL
- `getCache(key)` - Retrieve data from Redis
- `deleteCache(key)` - Remove data from cache
- `getKeysByPattern(pattern)` - Find cache keys by pattern
- `clearAll()` - Clear entire cache

### 2. **Cache Persistence Worker** (`workers/cachePersistenceWorker.js`)
- Runs in background every 1 second
- Monitors Redis for cached messages
- After 5 seconds TTL expires, removes cache entries
- Logs all cache operations

### 3. **Message Controller** (`controllers/message.controller.js`)
When a message is sent:
1. Message is saved to MongoDB immediately
2. Message is cached in Redis with 5-second TTL
3. Conversation cache is updated
4. Socket.io emits the message to users

### 4. **Socket.IO Handler** (`index.js`)
Real-time messages via WebSocket also use caching:
1. Message saved to MongoDB
2. Message cached in Redis
3. Emitted to receiver and sender

## Cache Key Format

- **Individual Messages**: `message:{messageId}`
- **Conversation Cache**: `messages:{userId1}:{userId2}`

## Usage Examples

### Sending a Message via REST API
```javascript
POST /api/messages/send
{
  "receiverId": "user123",
  "content": "Hello!",
  "imageUrl": "https://...",  // optional
  "publicId": "..."  // optional
}
```

The message will:
1. Be saved to MongoDB
2. Be cached in Redis for 5 seconds
3. Be automatically removed from Redis after 5 seconds
4. Remain in MongoDB permanently

### Getting Messages (from DB, not cache)
```javascript
GET /api/messages/{receiverId}
```

### Clearing Cache Manually
```javascript
// In your code:
const cacheService = require('./services/cacheService');
await cacheService.clearAll(); // Clear all cache
await cacheService.deleteCache('message:123'); // Delete specific message
```

## Configuration

### Change Cache TTL
Edit [config/redis.js](config/redis.js) or modify in `services/cacheService.js`:

```javascript
// Default 5 seconds
const cacheService = new CacheService(5);

// Or when setting cache
await cacheService.setCache(key, data, 10); // 10 seconds
```

### Change Persistence Check Interval
In [index.js](index.js):

```javascript
// Check every 500ms instead of 1000ms
const cachePersistenceWorker = new CachePersistenceWorker(500);
```

## Monitoring Cache

### View Redis Keys
```bash
redis-cli
> keys *
> get message:123
> del message:123
```

### Monitor Cache Operations
Check console logs from the server. You'll see:
```
Cached: message:507f1f77bcf86cd799439011 (TTL: 5s)
Cache hit: message:507f1f77bcf86cd799439011
Cache miss: message:507f1f77bcf86cd799439011
Deleted from cache: message:507f1f77bcf86cd799439011
```

## Benefits

✅ **Fast Reads**: Cache provides instant data access
✅ **Reduced DB Load**: Frequently accessed data served from Redis
✅ **Automatic Cleanup**: TTL ensures memory is not bloated
✅ **Persistence**: Data always saved to MongoDB
✅ **Real-time**: Socket.io and REST API both use cache
✅ **Scalability**: Easy to distribute cache across servers

## Troubleshooting

### Redis Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Make sure Redis server is running
```bash
redis-cli ping  # Should return PONG
```

### Messages Not Caching
Check server logs for caching errors. Ensure `REDIS_HOST` and `REDIS_PORT` are correct in `.env`.

### High Memory Usage
Reduce TTL value or reduce cache check frequency.

## Future Enhancements

- Add Redis persistence (RDB/AOF)
- Implement cache warming strategies
- Add cache statistics and metrics
- Implement LRU eviction policies
- Add cache invalidation on message updates/deletes

