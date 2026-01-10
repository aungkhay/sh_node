const { RewardType } = require('../models');

module.exports = async () => {
    const types = [
        {
            title: '共济基金',
            total_count: 50,
            remain_count: 50,
            range_min: 1,
            range_max: 5,
            amount_min: 10000,
            amount_max: 30000
        },
        {
            title: '上合战略黄金持有克数',
            total_count: 50,
            remain_count: 50,
            range_min: 6,
            range_max: 10
        },
        {
            title: '账户余额',
            total_count: 50,
            remain_count: 50,
            range_min: 11,
            range_max: 25,
            amount_max: 2,
            amount_max: 100
        },
        {
            title: '上合组织各国授权书',
            total_count: 50,
            remain_count: 50,
            range_min: 26,
            range_max: 35
        },
        {
            title: '未中奖',
            total_count: 50,
            remain_count: 50,
            range_min: 36,
            range_max: 70
        },
        {
            title: '上合组织中国区授权书',
            total_count: 50,
            remain_count: 50,
            range_min: 71,
            range_max: 80
        },
        {
            title: '上合战略储备黄金券',
            total_count: 50,
            remain_count: 50,
            range_min: 81,
            range_max: 90
        },
        {
            title: '推荐金提取券',
            total_count: 50,
            remain_count: 50,
            range_min: 91,
            range_max: 100,
            amount_min: 10,
            amount_max: 100,
            description: '10%-100%'
        },
    ];

    const count = await RewardType.count();
    if (count == 0) {
        await RewardType.bulkCreate(types);
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] RewareTypeSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] RewaredType Data Exists.');
    }
}