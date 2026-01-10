const ioredis = require('ioredis');
const client = ioredis.createClient({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    username: process.env.REDIS_USER,
    password: process.env.REDIS_PASS,
    // db: process.env.REDIS_DB,
    maxRetriesPerRequest: 20,
    retryStrategy(times) {
        console.warn(`Retrying redis connection: attempt ${times}`);
        return Math.min(times * 500, 2000);
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