const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { ipKeyGenerator } = require('express-rate-limit');
const MyResponse = require('../helpers/MyResponse');

module.exports = function createRateLimiter(redis) {
    return rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 60,             // 60 requests per minute
        standardHeaders: true,
        legacyHeaders: false,

        skip: (req) => req.method === 'OPTIONS',

        keyGenerator: (req) => {
            console.log('RateLimit:', req.method, req.originalUrl);
            return `rl:ip:${ipKeyGenerator(req)}`;
        },

        handler: (req, res) => {
            return MyResponse(res, 429, false, 'Too many requests, please try again later', {});
        },

        store: new RedisStore({
            sendCommand: (...args) => redis.call(...args),
        }),
    });
};