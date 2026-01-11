const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { ipKeyGenerator } = require('express-rate-limit');

module.exports = function createRateLimiter(redis) {
    return rateLimit({
        windowMs: 1000, // 1 second
        max: 5,         // 5 requests / second
        standardHeaders: true,
        legacyHeaders: false,

        keyGenerator: (req) => {
            return `rl:ip:${ipKeyGenerator(req)}`;
        },

        handler: (req, res) => {
            return res.status(429).json({
                success: false,
                message: 'Too many requests, please try again later'
            });
        },

        store: new RedisStore({
            sendCommand: (...args) => redis.call(...args),
        }),
    });
};
