const { Sequelize } = require('sequelize');
const { queryLogger }  = require('../helpers/Logger');

require('dotenv').config({ path: `./.env` });
const env = process.env;

const db = new Sequelize(env[`DB_NAME`], env[`DB_USER`], env[`DB_PASS`], {
    host: env[`DB_HOST`],
    port: env[`DB_PORT`],
    dialect: 'mysql',
    timezone: '+08:00', 
    // replication: {
    //     write: {
    //         host: env.DB_MASTER_HOST,
    //         port: env.DB_PORT
    //     },
    //     read: [
    //         {
    //             host: env.DB_SLAVE_HOST,
    //             port: env.DB_PORT
    //         }
    //         // you can add more slaves here
    //     ]
    // },
    dialectOptions: {
        connectTimeout: 60000
    },
    logging: console.log,
    logging: (str) => {
        // queryLogger(str.replace('Executing (default): ', ''));
    },
    pool: {
        max: 20,
        min: 3,
        acquire: 120000,
        idle: 120000,
        evict: 120000,
    },
    retry: {
        max: 3,
        match: [
            /Deadlock/i,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/
        ]
    }
});

module.exports = db;