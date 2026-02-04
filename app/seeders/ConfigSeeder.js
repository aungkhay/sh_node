const { Config } = require('../models');
const Redis = require('../connections/Redis');

module.exports = async () => {
    const configs = [
        {
            type: 'win_per_day',
            title: 'User wining per day',
            val: '3',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'referral_bonus_lv1',
            title: 'Referral Bonus for Level 1',
            val: '10',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'referral_bonus_lv2',
            title: 'Referral Bonus for Level 2',
            val: '5',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'referral_bonus_lv3',
            title: 'Referral Bonus for Level 3',
            val: '1',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'rank_point_lv1',
            title: 'Rank point for Level 1',
            val: '100',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'rank_point_lv2',
            title: 'Rank point for Level 2',
            val: '50',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'rank_point_lv3',
            title: 'Rank point for Level 3',
            val: '20',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'withdrawal_time_for_referral_bonus',
            title: 'Withdrawal time for referral bonus',
            val: '12:00:00-17:00:00',
            description: '-',
            data_type: 'string'
        },
        {
            type: 'earn_interest_rate',
            title: 'Earn Interest rate per day',
            val: '1',
            description: '-',
            data_type: 'double'
        },
        {
            type: 'earn_interest_rate_per_year',
            title: 'Earn Interest rate per year',
            val: '1.35',
            description: '-',
            data_type: 'double'
        },
        {
            type: 'digital_agreement',
            title: 'Digital Agreement',
            val: '<p>This is the digital agreement</p>',
            description: '-',
            data_type: 'html'
        },
        {
            type: 'ali_oss',
            title: 'OSS File Path',
            val: 'http://chinamainland.oss-cn-hongkong.aliyuncs.com',
            description: '-',
            data_type: 'string'
        },
        {
            type: 'gold_price_changes',
            title: 'Gold Price Changes (%)',
            val: '3',
            description: '-',
            data_type: 'integer'
        },
        {
            type: 'gold_interest_rate',
            title: 'Gold Interest Rate',
            val: '0.01',
            description: '-',
            data_type: 'double'
        },
        {
            type: 'news_random_rankpoint',
            title: 'News random rank point',
            val: '[100,1000]',
            description: '-',
            data_type: 'array'
        },
        {
            type: 'sensitive_word',
            title: 'Sensitive Word',
            val: '[]',
            description: '-',
            data_type: 'array'
        },
        {
            type: 'deposit_time',
            title: 'Deposit Time',
            val: '08:00:00-18:00:00',
            description: '-',
            data_type: 'string'
        },
        {
            type: 'can_deposit',
            title: 'Can Deposit',
            val: '0',
            description: '-',
            data_type: 'string'
        },
        {
            type: 'can_withdraw',
            title: 'Can Withdraw',
            val: '0',
            description: '0:关闭   1:开通',
            data_type: 'boolean'
        },
        {
            type: 'customer_service_1',
            title: 'Customer Service 1',
            val: 'http://customer-service-1.com',
            description: '-',
            data_type: 'string'
        },
        {
            type: 'customer_service_2',
            title: 'Customer Service 2',
            val: 'http://customer-service-2.com',
            description: '-',
            data_type: 'string'
        },
        {
            type: 'popup_announcement',
            title: 'Popup Announcement',
            val: '<p>This is a popup announcement</p>',
            description: '-',
            data_type: 'html'
        },
        {
            type: 'can_withdraw',
            title: 'Can Withdraw',
            val: '0',
            description: '0:关闭   1:开通',
            data_type: 'boolean'
        },
        {
            type: 'popup_announcement_1',
            title: 'Popup Announcement 1',
            val: '<p>This is a popup announcement</p>',
            description: '-',
            data_type: 'html'
        },
    ];

    const count = await Config.count();
    if (count == 0) {
        for (let index = 0; index < configs.length; index++) {
            const config = configs[index];
            await Redis.set(`${process.env.REDIS_PREFIX}_${config.type}`, config.val);
        }
        await Config.bulkCreate(configs);
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] ConfigSeeder has been seeded successfully.');
    } else {
        const existingConfigs = await Config.findAll({ attributes: ['type', 'val'] });
        for (let index = 0; index < existingConfigs.length; index++) {
            const config = existingConfigs[index];
            await Redis.set(`${process.env.REDIS_PREFIX}_${config.type}`, config.val);
            console.log('\x1b[32m[Redis]\x1b[0m', `Config "${config.type}" loaded to Redis.`);
        }
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] Config Data Exists.');
    }
}