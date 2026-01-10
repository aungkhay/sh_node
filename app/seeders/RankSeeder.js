const { Rank } = require('../models');

module.exports = async () => {
    const ranks = [
        {
            name: '游客',
            number_of_impeach: 0,
            require_count: 0,
            allowance: 0,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '预备役',
            number_of_impeach: 0,
            require_count: 0,
            allowance: 0,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '上等兵',
            number_of_impeach: 0,
            require_count: 1500,
            allowance: 500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '下比',
            number_of_impeach: 0,
            require_count: 2000,
            allowance: 500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '中士',
            number_of_impeach: 0,
            require_count: 2500,
            allowance: 500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '上士',
            number_of_impeach: 0,
            require_count: 2500,
            allowance: 1000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '四级军士太',
            number_of_impeach: 2,
            require_count: 3000,
            allowance: 1000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '三级军士长',
            number_of_impeach: 2,
            require_count: 3500,
            allowance: 1000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '二级军士长',
            number_of_impeach: 2,
            require_count: 4000,
            allowance: 1000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '一级军士长',
            number_of_impeach: 2,
            require_count: 4500,
            allowance: 1000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '少尉',
            number_of_impeach: 3,
            require_count: 5000,
            allowance: 1000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '中尉',
            number_of_impeach: 3,
            require_count: 5500,
            allowance: 1500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '上尉',
            number_of_impeach: 3,
            require_count: 6000,
            allowance: 1500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '少校',
            number_of_impeach: 5,
            require_count: 6500,
            allowance: 1500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '中校',
            number_of_impeach: 5,
            require_count: 7000,
            allowance: 1500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '上校',
            number_of_impeach: 5,
            require_count: 7500,
            allowance: 1500,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '大校',
            number_of_impeach: 5,
            require_count: 8000,
            allowance: 2000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '少将',
            number_of_impeach: 10,
            require_count: 8500,
            allowance: 2000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '中将',
            number_of_impeach: 10,
            require_count: 9000,
            allowance: 2000,
            allowance_rate: 98,
            salary_rate: 50
        },
        {
            name: '上将',
            number_of_impeach: 10,
            require_count: 9500,
            allowance: 2000,
            allowance_rate: 98,
            salary_rate: 50
        },
    ];

    const count = await Rank.count();
    if (count == 0) {
        await Rank.bulkCreate(ranks);
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] RankSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] Rank Data Exists.');
    }
}