const { encrypt } = require('../helpers/AESHelper');
const { User } = require('../models');
 
const PASS_KEY = process.env.PASS_KEY;
const PASS_IV = process.env.PASS_IV;
const PASS_PREFIX = process.env.PASS_PREFIX;
const PASS_SUFFIX = process.env.PASS_SUFFIX;

module.exports = async () => {
    const users = [
        {
            type: 1,
            name: "Super Admin",
            phone_number: '13914725800',
            password: encrypt(PASS_PREFIX + 'superadmin@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001111',
            relation: '/1',
            status: 1
        },
        {
            type: 1,
            name: "Admin 1",
            phone_number: '13914725801',
            password: encrypt(PASS_PREFIX + 'admin1@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001112',
            relation: '/2',
            status: 1
        },
        {
            type: 1,
            name: "Admin 2",
            phone_number: '13914725802',
            password: encrypt(PASS_PREFIX + 'admin2@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001113',
            relation: '/3',
            status: 1
        },
        {
            type: 1,
            name: "代理1",
            phone_number: '13914725803',
            password: encrypt(PASS_PREFIX + 'daili1@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001114',
            relation: '/2/4',
            status: 1
        },
        {
            type: 1,
            name: "代理2",
            phone_number: '13914725804',
            password: encrypt(PASS_PREFIX + 'daili2@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001115',
            relation: '/2/5',
            status: 1
        },
        {
            type: 1,
            name: "代理3",
            phone_number: '13914725805',
            password: encrypt(PASS_PREFIX + 'daili3@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001116',
            relation: '/2/6',
            status: 1
        },
        {
            type: 1,
            name: "代理4",    
            phone_number: '13914725806',
            password: encrypt(PASS_PREFIX + 'daili4@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001117',
            relation: '/2/7',
            status: 1
        },
        {
            type: 1,
            name: "代理5",
            phone_number: '13914725807',
            password: encrypt(PASS_PREFIX + 'daili5@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001118',
            relation: '/3/8',
            status: 1
        },
        {
            type: 1,
            name: "代理6",
            phone_number: '13914725808',    
            password: encrypt(PASS_PREFIX + 'daili6@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001119',
            relation: '/3/9',
            status: 1
        },
        {
            type: 1,
            name: "代理7",
            phone_number: '13914725809',
            password: encrypt(PASS_PREFIX + 'daili7@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001120',
            relation: '/3/10',
            status: 1
        },
        {
            type: 1,
            name: "代理8",
            phone_number: '13914725810',
            password: encrypt(PASS_PREFIX + 'daili8@123' + PASS_SUFFIX, PASS_KEY, PASS_IV),
            invite_code: '00001121',
            relation: '/3/11',
            status: 1
        }
    ];

    const count = await User.count();
    if (count == 0) {
        await User.bulkCreate(users);
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] UserSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] User Data Exists.');
    }
}