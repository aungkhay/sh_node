require('dotenv').config({ path: `./.env` })

const { connect } = require('../models');
connect();

const RoleSeeder = require('./RoleSeeder');
const PermissionSeeder = require('./PermissionSeeder');
const RankSeeder = require('./RankSeeder');
const ConfigSeeder = require('./ConfigSeeder');
const UserSeeder = require('./UserSeeder');
const RewardTypeSeeder = require('./RewardTypeSeeder');
const TicketSeeder = require('./TicketSeeder');
const MasonicSeeder = require('./MasonicSeeder');

const seed = async () => {
    await RoleSeeder();
    await PermissionSeeder();
    await RankSeeder();
    await ConfigSeeder();
    await UserSeeder();
    await RewardTypeSeeder();
    await TicketSeeder();
    await MasonicSeeder();

    console.log('\x1b[32m%s\x1b[0m', '[Seeder] All seeders are seeded successfully');
    process.exit();
}

seed();