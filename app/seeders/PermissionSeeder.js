const { Permission } = require('../models');

module.exports = async () => {
    const permissions = require('../configs/permissions.json');

    const count = await Permission.count();
    if (count == 0) {
        await Permission.bulkCreate(permissions);
        console.log('\x1b[32m%s\x1b[0m', '[seeder] PermissionSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[seeder] Permission Data Exists.');
    }
}