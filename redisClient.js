const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL?.trim();

let redis = null;
let redisReady = false;
let redisEnabled = false;

if (redisUrl) {
    redisEnabled = true;

    redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times) {
            if (times > 3) {
                console.error('Redis connection retries exhausted. Redis features will stay unavailable until restart.');
                return null;
            }

            return Math.min(times * 500, 2000);
        },
    });

    redis.on('connect', () => {
        console.log('Connected to Redis successfully!');
    });

    redis.on('ready', () => {
        redisReady = true;
    });

    redis.on('close', () => {
        redisReady = false;
    });

    redis.on('error', (err) => {
        redisReady = false;
        console.error('Redis connection error:', err.message);
    });
} else {
    console.warn('REDIS_URL is not set. Redis-backed queue features are disabled.');
}

const isRedisConfigured = () => redisEnabled;
const isRedisReady = () => Boolean(redis && redisReady);

module.exports = {
    redis,
    isRedisConfigured,
    isRedisReady,
};
