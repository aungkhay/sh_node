const { Sequelize } = require('sequelize');
const { queryLogger }  = require('../helpers/Logger');

require('dotenv').config({ path: `./.env` });
const env = process.env;

let dbUser = null;
let dbPass = null;
let dbHost = null;
let dbPort = null;
let isProduction = Number(env.IS_PRODUCTION || 0) == 1;
console.log('=== IS_PRODUCTION ===', isProduction);
if (isProduction) {
    dbUser = env.DB_USER_PROD;
    dbPass = env.DB_PASS_PROD;
} else {
    dbUser = env.DB_USER;
    dbPass = env.DB_PASS;
    dbHost = env.DB_HOST;
    dbPort = env.DB_PORT;
}

const replication = {
    write: {
        host: env.DB_MASTER_HOST,
        port: env.DB_MASTER_PORT,
        username: env.DB_MASTER_USER,
        password: env.DB_MASTER_PASS
    },
    read: [
        {
            host: env.DB_SLAVE_HOST,
            port: env.DB_SLAVE_PORT,
            username: env.DB_SLAVE_USER,
            password: env.DB_SLAVE_PASS
        }
        // you can add more slaves here
    ]
}
const opitons = {
    dialect: 'mysql',
    timezone: '+08:00', 
    dialectOptions: {
        connectTimeout: 60000,
        supportBigNumbers: true,
        bigNumberStrings: true
    },
    logging: false,
    // logging: (str) => {
    //     queryLogger(str.replace('Executing (default): ', ''));
    // },
    pool: {
        max: 15,
        min: 2,
        acquire: 30000,
        idle: 10000,
        evict: 10000,
    },
    retry: {
        max: 3,
        match: [
            /Deadlock/i,
            /Lock wait timeout exceeded/i,
            /SequelizeConnectionError/,
            /SequelizeConnectionTimedOutError/
        ]
    }
}

if (isProduction) {
    opitons.replication = replication;
} else {
    opitons.host = dbHost;
    opitons.port = dbPort;
}

const db = new Sequelize(env[`DB_NAME`], dbUser, dbPass, opitons);
module.exports = db;