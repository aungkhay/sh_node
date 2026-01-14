const RedisLib = require('ioredis'); // or your redis client

let redis;

async function createRedis() {
    if (redis) {
        try { await redis.quit(); } catch { }
    }

    redis = new RedisLib({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        commandTimeout: 10000,
        retryStrategy: () => 2000
    });

    redis.on('error', err => {
        console.error('[REDIS ERROR]', err.message);
    });

    redis.on('end', () => {
        console.error('[REDIS] Connection closed, reconnecting...');
        setTimeout(createRedis, 1000);
    });
}

async function startWorker() {
    await createRedis();

    while (true) {
        try {
            const data = await redis.brpop('requestQueue', 5);

            if (!data) continue;

            const payload = JSON.parse(data[1]);
            console.log(new Date().getTime());
            console.log('[WORKER] Processing:', payload.path);

            // 🔥 SIMULATE WORK
            await handleJob(payload);

        } catch (err) {
            console.error('[WORKER ERROR]', err.message);

            // 🔥 CRITICAL PART
            await createRedis();
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

async function handleJob(job) {
    // example heavy task
    await sleep(300);

    console.log('[WORKER] Done:', job.path);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startWorker();
