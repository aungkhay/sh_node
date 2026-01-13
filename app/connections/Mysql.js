const { Sequelize } = require('sequelize');
const { queryLogger }  = require('../helpers/Logger');

require('dotenv').config({ path: `./.env` });
const env = process.env;

const db = new Sequelize(env[`DB_NAME`], null, null, {
    // host: env[`DB_HOST`],
    // port: env[`DB_PORT`],
    dialect: 'mysql',
    timezone: '+08:00', 
    // replication: {
    //     write: {
    //         host: env.DB_MASTER_HOST,
    //         port: env.DB_MASTER_PORT,
    //         username: env.DB_MASTER_USER,
    //         password: env.DB_MASTER_PASS
    //     },
    //     read: [
    //         {
    //             host: env.DB_SLAVE_HOST,
    //             port: env.DB_SLAVE_PORT,
    //             username: env.DB_SLAVE_USER,
    //             password: env.DB_SLAVE_PASS
    //         }
    //         // you can add more slaves here
    //     ]
    // },
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
});

module.exports = db;