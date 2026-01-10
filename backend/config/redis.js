const redis = require('redis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

// Only add password if it's configured
// if (process.env.REDIS_PASSWORD) {
//   redisConfig.password = process.env.REDIS_PASSWORD;
// }

const client = redis.createClient(redisConfig);

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.on('connect', () => {
  console.log('Connected to Redis');
});

client.connect().catch(console.error);

module.exports = client;
