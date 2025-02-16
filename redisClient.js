const Redis = require('ioredis');

// Use your actual Redis connection string from environment variables or hardcode for testing
const redis = new Redis("redis://default:fMCQhovlc8CUVOQWlHnYW5h2WkGs4xck@redis-10633.c11.us-east-1-3.ec2.redns.redis-cloud.com:10633");

redis.on('connect', () => {
    console.log('Connected to Redis successfully!');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redis;
