const { Sequelize } = require('sequelize');
const { queryLogger }  = require('../helpers/Logger');

require('dotenv').config({ path: `./.env` });
const env = process.env;

let dbUser = null;
let dbPass = null;
let dbHost = null;
let dbPort = null;

let isProduction = Number(env.IS_PRODUCTION || 0) == 1;
let isProxySQLEnabled = Number(env.IS_PROXYSQL_ENABLED || 0) == 1;

console.log('=== IS_PRODUCTION ===', isProduction);
console.log('=== IS_PROXYSQL_ENABLED ===', isProxySQLEnabled);
// if (isProduction) {
//     dbUser = env.DB_USER_PROD;
//     dbPass = env.DB_PASS_PROD;
// } else {
//     dbUser = env.DB_USER;
//     dbPass = env.DB_PASS;
//     dbHost = env.DB_HOST;
//     dbPort = env.DB_PORT;
// }

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
        },
        {
            host: env.DB_SLAVE1_HOST,
            port: env.DB_SLAVE1_PORT,
            username: env.DB_SLAVE1_USER,
            password: env.DB_SLAVE1_PASS
        }
        // you can add more slaves here
    ]
}
const options = {
    dialect: 'mysql',
    // benchmark: true,
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
        max: 20,
        min: 0,
        acquire: 60000,
        idle: 10000,
        evict: 10000,
    },
    retry: {
        max: 2,
        match: [
            /Deadlock/i,
            /Lock wait timeout exceeded/i,
            /SequelizeConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /SequelizeConnectionAcquireTimeoutError/,
            /ConnectionAcquireTimeoutError/,
        ],
        backoffBase: 200,
        backoffExponent: 1.5,
    }
}

// if (isProduction) {
//     opitons.replication = replication;
// } else {
//     opitons.host = dbHost;
//     opitons.port = dbPort;
// }
if (isProxySQLEnabled) {
    dbUser = env.DB_PROXYSQL_USER;
    dbPass = env.DB_PROXYSQL_PASS;
    dbHost = env.DB_PROXYSQL_HOST;
    dbPort = Number(env.DB_PROXYSQL_PORT);

    options.host = dbHost;
    options.port = dbPort;
} else if (isProduction) {
    dbUser = env.DB_USER_PROD;
    dbPass = env.DB_PASS_PROD;

    options.replication = replication;
} else {
    dbUser = env.DB_USER;
    dbPass = env.DB_PASS;
    dbHost = env.DB_HOST;
    dbPort = Number(env.DB_PORT);

    options.host = dbHost;
    options.port = dbPort;
}


const db = new Sequelize(env[`DB_NAME`], dbUser, dbPass, options);
module.exports = db;