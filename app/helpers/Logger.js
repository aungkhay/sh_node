'use strict'
const winston = require('winston');
const { combine, timestamp, json, printf, align } = winston.format;
const moment = require('moment');

const fileName = moment(new Date()).format('YYYY-MM-DD');

const consoleLog = new winston.transports.Console();

function createRequestLogger() {
    const logger = winston.createLogger({
        format: combine(
            timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
            json(),
            printf(info => {
                const {req, res} = info.message;
                return `\x1b[36m[${[info.timestamp]}]: [${res.statusCode}]\x1b[0m \x1b[32m${req.originalUrl}\x1b[0m   ${JSON.stringify(req.body ?? {})}`;
            })
        ),
        transports: [ 
            consoleLog,
            new winston.transports.File({ filename: `app/logs/requests/${fileName}.log`, level: 'info' }),
        ],
        exitOnError: false
    });

    return function logRequest(req, res) {
        logger.info({req, res});
    }
}

function createErrorLogger() {
    const logger = winston.createLogger({
        level: 'error',
        format: combine(
            timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
            align(), 
            printf(info => `${info.level}: [${[info.timestamp]}]: ${info.message}`)
        ),
        transports: [
            consoleLog,
            new winston.transports.File({ filename: `app/logs/errors/${fileName}.log`, level: 'error' }),
        ],
        exitOnError: false
    });

    return function logError(message) {
        logger.error(message);
    }
}

function createQueryLogger() {
    const logger = winston.createLogger({
        level: 'info',
        format: combine(
            timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
            align(), 
            printf(info => `${info.level}: [${[info.timestamp]}]: ${info.message}`)
        ),
        transports: [
            consoleLog,
            new winston.transports.File({ filename: `app/logs/requests/${fileName}.log`, level: 'info' }),
        ],
        exitOnError: false
    });

    return function logQuery(message) {
        logger.info(message);
    }
}

function createCommonLogger() {
    const logger = winston.createLogger({
        level: 'info',
        format: combine(
            timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
            align(), 
            printf(info => `${info.level}: [${[info.timestamp]}]: ${info.message}`)
        ),
        transports: [
            consoleLog,
            new winston.transports.File({ filename: `app/logs/common/${fileName}.log`, level: 'info' }),
        ],
        exitOnError: false
    });

    return function logInfo(message) {
        logger.info(message);
    }
}

module.exports = {
    reqLogger: createRequestLogger(),
    errLogger: createErrorLogger(),
    queryLogger: createQueryLogger(),
    commonLogger: createCommonLogger(),
};