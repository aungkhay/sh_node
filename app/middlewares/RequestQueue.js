module.exports = (APP) => {
    return async (req, res, next) => {
        try {
            const redis = APP.get('redis');

            const payload = {
                method: req.method,
                path: req.originalUrl,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                body: req.body,
                query: req.query,
                time: Date.now()
            };

            await redis.lpush(
                'requestQueue',
                JSON.stringify(payload)
            );

        } catch (err) {
            console.error('[REDIS QUEUE ERROR]', err);
            // do NOT block request
        }

        next();
    };
};
