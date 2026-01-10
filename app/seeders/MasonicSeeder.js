const { MasonicFund } = require('../models');
 
module.exports = async () => {
    const funds = [
        {
            amount: 2000000
        },
    ];

    const count = await MasonicFund.count();
    if (count == 0) {
        await MasonicFund.bulkCreate(funds);
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] MasonicSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] MasonicFund Data Exists.');
    }
}