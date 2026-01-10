const { Role } = require('../models');

module.exports = async () => {
    const roles = [
        {
            code: 'superadmin',
            name: '超级管理员'
        },
        {
            code: 'ordinaryadmin',
            name: '普通管理员'
        },
        {
            code: 'financialadmin',
            name: '财务管理员'
        }
    ];

    const count = await Role.count();
    if (count == 0) {
        await Role.bulkCreate(roles);
        console.log('\x1b[32m%s\x1b[0m', '[seeder] RoleSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[seeder] Role Data Exists.');
    }
}