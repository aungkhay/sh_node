require('module-alias/register');
const express = require('express');
const APP = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { reqLogger } = require('./app/helpers/Logger');

APP.set('trust proxy', true);

require('dotenv').config({ path: `./.env` });
const HOST = process.env.HOST;
const PORT = process.env.PORT;

APP.use(cors());
APP.use(bodyParser.json({ limit: '500mb' })); // for parsing application/json
APP.use(bodyParser.urlencoded({ extended: true, limit: '500mb' })); // for parsing application/x-www-form-urlencoded
APP.use('/uploads', express.static('uploads'));

// Redis Connection
const Redis = require('./app/connections/Redis');
APP.set('redis', Redis);

// DB Connection
const { connect, syncDB } = require('./app/models');
(async () => {
    await connect();
    await syncDB(); // <-- Creates tables
})();

APP.get('/', (req, res) => {
    return res.status(400).json({ success: false, message: 'Invalid endpoint!' });
});

const { decryptReqBody, decryptReqQuery } = require('./app/helpers/AESHelper');
const RouteDetector = require('./app/helpers/RouteDetector');
const MyResponse = require('./app/helpers/MyResponse');
const PUBLIC_ROUTES = [
    '/',
    '/api/get-recaptcha',
    '/api/get-popup-announcement',
    '/api/get-server-time',
    '/admin/get-recaptcha',
];
APP.use((req, res, next) => {
    // console.log("***** ip *****", req.ip);
    /* ---------- async logger ---------- */
    res.on('finish', () => {
        try {
            reqLogger(req, res);
        } catch (e) {
            console.error('[Logger]', e);
        }
    });
     /* ---------- skip heavy logic ---------- */
    if (PUBLIC_ROUTES.includes(req.path)) {
        return next();
    }

    try {
        if(req.body?.data) {
            const decrypted = decryptReqBody(req.body.data);
            Object.assign(req.body, decrypted);
            delete req.body.data;
        }
        if(req.query?.data) {
            const decrypted = decryptReqQuery(req.query.data);
            Object.defineProperty(req, 'query', {
                value: decrypted,
                writable: true,
                enumerable: true,
                configurable: true,
            });
            delete req.query.data;
        }

        /* ---------- route permission ---------- */
        if (!req.path.startsWith('/admin') && !RouteDetector(req)) {
            return MyResponse(res, 400, false, 'Action Denied!', {});
        }

        next();
    } catch (error) {
        console.log(error.stack);
        return MyResponse(res, 400, false, 'We are sorry. Please try again later!', {});
    }
})

const UserRoute = require('./app/routes/User');
APP.use('/api', new UserRoute(APP));
const AdminRoute = require('./app/routes/Admin');
APP.use('/admin', new AdminRoute(APP));

// Cron
if (Number(process.env.IS_MASTER || 1) == 1) {
    const CronJob = require('./app/cron');
    const cron = new CronJob(APP);
    cron.START();
}

// Start Server
APP.listen(PORT, HOST, () => {
    console.log(`\x1b[34m[APP]\x1b[0m Listening on ====>`, `\x1b[34mhttp://${HOST}:${PORT}\x1b[0m`);
});