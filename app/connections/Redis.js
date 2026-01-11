const ioredis = require('ioredis');
const client = ioredis.createClient({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASS,
    // db: process.env.REDIS_DB,
    connectTimeout: 5000, // 5 seconds connection timeout
    commandTimeout: 3000, // 3 seconds command timeout
    maxRetriesPerRequest: 3, // Reduced from 20 to 3
    retryStrategy(times) {
        if (times > 3) {
            console.error(`Redis retry limit exceeded after ${times} attempts`);
            return null; // Stop retrying
        }
        console.warn(`Retrying redis connection: attempt ${times}`);
        return Math.min(times * 500, 1000); // Reduced max delay from 2000ms to 1000ms
    },
})

client.on("connecting", () => {
    console.log("Connecting to Redis.");
});
client.on("connect", () => {
    console.log('\x1b[32m[REDIS]\x1b[0m', 'Connection established.');
});
client.on("error", (err) => {
    if (err.code === "ECONNREFUSED") {
        console.warn(`Could not connect to Redis: ${err.message}.`);
    } else if (err.name === "MaxRetriesPerRequestError") {
        console.error(`Critical Redis error: ${err.message}. Shutting down.`);
    } else {
        console.error(`Redis encountered an error: ${err.message}.`);
    }
    client.connect();
});

module.exports = client;