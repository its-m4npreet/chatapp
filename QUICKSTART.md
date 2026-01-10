# 🚀 Quick Start Guide - Redis Caching

## 5-Minute Setup

### 1️⃣ Install Redis Server (Choose one)

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:latest
```

### 2️⃣ Verify Redis is Running
```bash
redis-cli ping
# Expected output: PONG ✓
```

### 3️⃣ Configure Backend Environment

Edit `backend/.env`:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 4️⃣ Install Dependencies
```bash
cd backend
npm install
```

### 5️⃣ Start Backend Server
```bash
npm run dev
```

You should see:
```
Connected to Redis ✓
Cache persistence worker started ✓
Server is running on http://localhost:3000 ✓
```

---

## ✨ What Happens Now?

```
┌─────────────────────────────────────────────┐
│   User sends a message                      │
└─────────────────────┬───────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
    ✓ Saved to             ✓ Cached in Redis
      MongoDB                (5 second TTL)
      (Permanent)            (Fast Access)
        │                           │
        └─────────────┬─────────────┘
                      │
                      ▼
    ✓ Real-time emit via WebSocket
    ✓ Response to user (201 Created)
    
After 5 seconds:
    │
    ▼
    ✓ Cache auto-removed (by worker)
    ✓ Data remains in MongoDB
    ✓ Memory is freed
```

---

## 🧪 Test It

### Option 1: Quick Test Script
```bash
bash test-redis.sh --quick
```

### Option 2: Manual Test

**Terminal 1 - Monitor Redis:**
```bash
redis-cli MONITOR
```

**Terminal 2 - Send Message:**
```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "receiverId": "user123",
    "content": "Hello Redis!"
  }'
```

**Terminal 1 Output:** You'll see Redis commands being executed!

### Option 3: Use Redis CLI
```bash
redis-cli
> KEYS message:*          # See cached messages
> GET message:ABC123     # View a cached message
> TTL message:ABC123     # See remaining time (in seconds)
> MONITOR                # Watch all Redis operations
```

---

## 📊 What's Cached?

### Cache Keys
```
message:{messageId}
  └─ Individual messages (5s TTL)

messages:{userId1}:{userId2}
  └─ Conversation cache (5s TTL)
```

### Example
```bash
redis-cli
> KEYS *
1) "message:507f1f77bcf86cd799439011"
2) "messages:123:456"
3) "message:507f1f77bcf86cd799439012"

> GET message:507f1f77bcf86cd799439011
"{\"_id\":\"507f1f77bcf86cd799439011\",\"sender\":\"user1\",\"content\":\"Hello!\"}"

> TTL message:507f1f77bcf86cd799439011
(integer) 3              # 3 seconds remaining
```

---

## 🎯 Key Features

✅ **Speed**: Messages served from Redis (microseconds)
✅ **Durability**: All data saved to MongoDB
✅ **Auto-Cleanup**: 5-second TTL prevents memory bloat
✅ **Real-Time**: WebSocket + REST API both cached
✅ **No Configuration Needed**: Works out of the box

---

## 📁 Files Created

```
backend/
├── config/redis.js                    # Redis connection
├── services/cacheService.js           # Cache operations
├── workers/cachePersistenceWorker.js  # Auto persistence
└── (controllers/message.controller.js - UPDATED)
└── (index.js - UPDATED)

Root/
├── REDIS_SETUP.md                     # Detailed setup
├── REDIS_DOCUMENTATION.md             # Full documentation
├── CACHE_FLOW.md                      # Visual diagrams
├── setup-redis.sh                     # Setup script
└── test-redis.sh                      # Testing script
```

---

## 🔧 Configuration Options

### Change Cache Duration
Edit `services/cacheService.js`:
```javascript
constructor(cacheTTL = 10)  // Changed from 5 to 10 seconds
```

### Change Check Frequency
Edit `index.js`:
```javascript
new CachePersistenceWorker(500)  // Check every 500ms instead of 1000ms
```

### Redis Connection
Edit `config/redis.js`:
```javascript
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});
```

---

## 🐛 Troubleshooting

### "Redis server not found"
```bash
# Check if Redis is running
redis-cli ping

# If not, start it:
redis-server
```

### "Cannot connect to 127.0.0.1:6379"
```bash
# Check .env has correct host/port
cat backend/.env | grep REDIS

# Verify Redis config
redis-cli CONFIG GET port
redis-cli CONFIG GET bind
```

### "Cache not working"
```bash
# Check in Redis CLI
redis-cli
> DBSIZE              # Should show cached entries
> KEYS message:*      # Should show message keys
> MONITOR             # Watch for operations
```

---

## 📈 Monitor Performance

### Check Cache Status
```javascript
// In browser console or API endpoint
const cacheStats = {
  // Monitored automatically via console logs
  // Check server terminal for:
  // "Cache hit: message:..."
  // "Cache miss: message:..."
  // "Cached: message:..."
  // "Deleted from cache: message:..."
};
```

### Redis Memory Usage
```bash
redis-cli INFO memory
```

### Cache Hit/Miss Rate
Check server console for automatic logging:
```
Cache hit: message:123   ✓ (Fast)
Cache miss: message:456  ✓ (From DB)
Cached: message:789      ✓ (Saved)
Deleted from cache: message:123  ✓ (TTL expired)
```

---

## 🚀 Next Steps

1. **Test the cache** - Send some messages and monitor
2. **Adjust TTL** - Tune cache duration for your needs
3. **Add more caching** - Cache group messages, notifications, etc.
4. **Monitor metrics** - Track cache hit rates
5. **Optimize further** - Add cache warming, distributed caching

---

## 📚 Learn More

- [Full Documentation](./REDIS_DOCUMENTATION.md)
- [Cache Architecture](./CACHE_FLOW.md)
- [Setup Guide](./REDIS_SETUP.md)
- [Redis Official Docs](https://redis.io/documentation)

---

## ✅ Checklist

- [ ] Redis server installed
- [ ] Redis running (`redis-cli ping` returns PONG)
- [ ] `.env` configured with REDIS_HOST and REDIS_PORT
- [ ] `npm install` completed
- [ ] Server started with `npm run dev`
- [ ] Console shows "Connected to Redis"
- [ ] Console shows "Cache persistence worker started"
- [ ] Test message sent and cached
- [ ] `redis-cli KEYS *` shows cached messages

---

**You're all set! Your chat app now has super-fast Redis caching! 🎉**
