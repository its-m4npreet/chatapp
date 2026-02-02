const redis = require('redis');

const redisConfig = {
  url: process.env.REDIS_URL,
  socket: {
    // More aggressive retry strategy for cloud Redis (Upstash)
    reconnectStrategy: (retries) => {
      // Significantly higher retry limit (100 instead of 10)
      if (retries > 100) {
        console.error('Max Redis retries exceeded, giving up');
        return new Error('Max retries exceeded');
      }
      // Exponential backoff with max delay of 5 seconds
      const delay = Math.min(retries * 100, 5000);
      return delay;
    },
    connectTimeout: 15000, // 15 seconds for cloud connection
    noDelay: true, // Disable Nagle's algorithm
    keepAlive: 5000, // Send keep-alive every 5 seconds
    family: 4, // Force IPv4
  },
  // Client-side caching options
  legacyMode: false,
  // Retry strategy at client level
  maxRetriesPerRequest: 3,
  // More lenient timeout
  commandTimeout: 5000,
};

const client = redis.createClient(redisConfig);

// Track connection state
let isConnected = false;
let connectionAttempts = 0;
let keepAliveInterval = null;

client.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
  isConnected = false;
});

client.on('connect', () => {
  connectionAttempts = 0;
  console.log('Connected to Redis');
  
  // Start keep-alive ping
  startKeepAlive();
});

client.on('reconnecting', () => {
  connectionAttempts++;
  if (connectionAttempts % 5 === 0) {
    console.log(`Reconnecting to Redis (attempt ${connectionAttempts})...`);
  }
  isConnected = false;
});

client.on('ready', () => {
  console.log('Redis client ready');
  isConnected = true;
});


// Keep-alive mechanism to prevent idle timeout
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  keepAliveInterval = setInterval(async () => {
    try {
      if (isConnected) {
        await client.ping();
      }
    } catch (error) {
      // Ping failed, connection will reconnect automatically
    }
  }, 10000); // Ping every 10 seconds
}

// Initialize connection
client.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err.message);
});

// Export helper to check connection status (use native properties)
// Note: node-redis v4+ has `isReady` and `isOpen` as getters
const getRedisStatus = () => ({
  isReady: client.isReady,
  isOpen: client.isOpen
});

module.exports.getRedisStatus = getRedisStatus;


// Graceful shutdown
process.on('SIGTERM', async () => {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  try {
    await client.quit();
  } catch (error) {
    console.error('Error closing Redis:', error.message);
  }
});

module.exports = client;
