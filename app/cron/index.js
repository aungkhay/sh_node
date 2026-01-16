const cron = require('node-cron');
const { User, Rank, UserKYC, db, Allowance, Config, Transfer, Interest, GoldPrice, RewardType, RewardRecord, GoldInterest, TempMasonicFundHistory, MasonicFundHistory, MasonicFund } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { commonLogger, errLogger } = require('../helpers/Logger');
const Decimal = require('decimal.js');
const axios = require('axios');
const RedisHelper = require('../helpers/RedisHelper');

class CronJob {
    constructor(app) {
        this.redisHelper = new RedisHelper(app);
    }

    START = () => {
        console.log(`\x1b[34m[CRON]\x1b[0m Job Started ====>`);

        // Run at midnight on the first day of every month
        cron.schedule('0 0 15 * *', this.PAY_ALLOWANCE).start();
        // Every day at 3:00 AM
        cron.schedule('0 3 * * *', this.GOLD_INTEREST).start();
        // Every day at 6:00 AM
        cron.schedule('0 6 * * *', this.GET_GOLD_PRICE).start();
        // Every 6 hours
        cron.schedule('0 */6 * * *', this.RESET_ACTIVE).start();
        // Runs every day at midnight
        cron.schedule('0 0 * * *', this.RESET_REWARD_COUNT).start();
        cron.schedule('0 0 * * *', this.EARN_INTEREST).start();
        cron.schedule('0 0 * * *', this.RESET_TODAY_NEWS_REWARD_COUNT).start();
        cron.schedule('0 0 * * *', this.RESET_CAN_GET_RED_ENVELOPE).start();
        // Run at 23:30 every day
        cron.schedule('30 23 * * *', this.RESET_REWARD_TYPE).start();
        // Every 10 minutes
        cron.schedule('*/10 * * * *', this.SUBSTRACT_MASONIC_FUND).start();
        // Run 10th minute of every hour
        cron.schedule('10 * * * *', this.RESET_REMAIN_COUNT).start();
        cron.schedule('10 * * * *', this.RELEASE_REWARD_TO_ALL_USERS).start();
        // Run Every Hour at minute 0
        cron.schedule('0 * * * *', this.UPDATE_MASONIC_FUND_HISTORY).start();
    }

    PAY_ALLOWANCE = async () => {
        try {
            const ranks = await Rank.findAll({ 
                where: {
                    allowance: { [Op.gt]: 0 }
                },
                attributes: ['id', 'point', 'allowance', 'allowance_rate', 'salary_rate']
            });
            let lastId = 0;
            let totalProcessed = 0;
            const batchLimit = 1000;
            const concurrencyLimit = 50;

            while (true) {
                const users = await User.findAll({
                    include: {
                        model: UserKYC,
                        as: 'kyc',
                        where: { status: 'APPROVED' },
                        attributes: []
                    },
                    where: {
                        type: 2, // user
                        id: { [Op.gt]: lastId },
                        impeach_type: { [Op.in]: [0, 1] } // 0 => No impeachment | 1 => Salary Cut
                    },
                    attributes: ['id', 'relation', 'impeach_type', 'rank_id', 'startEmployed'],
                    limit: batchLimit,
                    order: [['id', 'ASC']]
                });

                if (users.length === 0) break;

                for (let i = 0; i < users.length; i += concurrencyLimit) {

                    const chunk = users.slice(i, i + concurrencyLimit);

                    await db.transaction(async (t) => {
                        await Promise.all(chunk.map(async (user) => {
                            const rank = ranks.find(r => r.id === user.rank_id);
                            if (!rank) return;

                            const start = new Date(user.startEmployed);
                            start.setMonth(start.getMonth() + 4);

                            let allowanceRate = 20;
                            if ((new Date()).getTime() > start) {
                                allowanceRate = 100;

                                // ✅Start Calculate remain 80%
                                const allowanceHistory = await Allowance.findAll({
                                    where: {
                                        user_id: user.id,
                                        allowance_rate: 20,
                                        is_calculated: 0,
                                    },
                                    attributes: ['id', 'rank_id', 'amount']
                                });

                                let allowanceArr = [];
                                let totalAmount = 0;
                                let allowIds = [];
                                for (let i = 0; i < allowanceHistory.length; i++) {
                                    const allow = allowanceHistory[i];
                                    allowIds.push(allow.id);

                                    let amt = (allow.amount * 5) - allow.amount;
                                    allowanceArr.push({
                                        relation: user.relation,
                                        user_id: user.id,
                                        rank_id: allow.rank_id,
                                        amount: amt,
                                        allowance_rate: 80
                                    });
                                    totalAmount += amt;
                                }
                                if (allowanceArr.length > 0) {
                                    await Allowance.bulkCreate(allowanceArr, { transaction: t });
                                    await Allowance.update({ is_calculated: 1 }, {
                                        where: {
                                            id: { [Op.in]: allowIds }
                                        },
                                        transaction: t
                                    });
                                    await user.increment({ rank_allowance: totalAmount }, { transaction: t })
                                }
                                // ✅End Calculate remain 80%
                            }

                            const allowance = parseFloat(rank.allowance) || 0;
                            const salaryRate = parseFloat(rank.salary_rate) || 0;

                            let rank_allowance = 0;
                            let freeze_allowance = 0;

                            if (user.impeach_type == 1) {
                                rank_allowance = new Decimal(allowance)
                                    .times(salaryRate)
                                    .times(0.01)
                                    .toNumber();
                                freeze_allowance = Number(allowance - rank_allowance);
                            } else if (user.impeach_type == 0) {
                                rank_allowance = new Decimal(allowance)
                                    .times(allowanceRate)
                                    .times(0.01)
                                    .toNumber();
                                freeze_allowance = Number(allowance - rank_allowance);
                            } else {
                                return;
                            }

                            await user.increment({ rank_allowance, freeze_allowance }, { transaction: t });
                            await Allowance.create({
                                relation: user.relation,
                                user_id: user.id,
                                rank_id: rank.id,
                                amount: rank_allowance,
                                freeze_amount: freeze_allowance,
                                allowance_rate: allowanceRate
                            }, { transaction: t });
                            commonLogger(`[PAY_ALLOWANCE][${user.id}][type: ${user.impeach_type}]: rank_allowance => ${rank_allowance} | freeze_allowance => ${freeze_allowance}`)
                        }));
                    });
                }
                lastId = users[users.length - 1].id;
                totalProcessed += users.length;
                commonLogger(`[PAY_ALLOWANCE]: Processed batch of ${users.length} users, up to ID ${lastId}`);
            }
            commonLogger(`[PAY_ALLOWANCE]: Finished processing. Total users processed: ${totalProcessed}`);
        } catch (error) {
            errLogger(`[PAY_ALLOWANCE]: ${error.stack}`);
        }
    }

    EARN_INTEREST = async () => {
        try {
            const config = await Config.findOne({
                where: { type: 'earn_interest_rate' },
                attributes: ['val']
            });
            const rate = config.val;
            let lastId = 0;
            let totalProcessed = 0;
            const batchLimit = 1000;
            const concurrencyLimit = 50;

            while (true) {
                const users = await User.findAll({
                    where: {
                        type: 2, // user
                        id: { [Op.gt]: lastId },
                        earn: { [Op.gt]: 0 }
                    },
                    attributes: ['id', 'relation', 'earn'],
                    limit: batchLimit,
                    order: [['id', 'ASC']]
                });

                if (users.length === 0) break;

                for (let i = 0; i < users.length; i += concurrencyLimit) {

                    const chunk = users.slice(i, i + concurrencyLimit);

                    await db.transaction(async (t) => {
                        await Promise.all(chunk.map(async (user) => {

                            const before = Number(user.earn);
                            const interest = new Decimal(before)
                                .times(rate)
                                .times(0.01)
                                .toNumber();
                            const after = before + interest;

                            await Interest.create({
                                relation: user.relation,
                                user_id: user.id,
                                amount: interest,
                                before_amount: before,
                                after_amount: after
                            }, { transaction: t });
                            await user.increment({ earn: interest }, { transaction: t });

                            commonLogger(`[EARN_INTEREST][${user.id}]: interest => ${interest} | before => ${before} | after => ${after}`);
                        }));
                    });
                }
                lastId = users[users.length - 1].id;
                totalProcessed += users.length;
                commonLogger(`[EARN_INTEREST]: Processed batch of ${users.length} users, up to ID ${lastId}`);
            }
            commonLogger(`[EARN_INTEREST]: Finished processing. Total users processed: ${totalProcessed}`);
        } catch (error) {
            errLogger(`[EARN_INTEREST]: ${error.stack}`);
        }
    }

    GET_GOLD_PRICE = async () => {
        try {
            const res = await axios.get('https://api.metalpriceapi.com/v1/latest', {
                params: {
                    api_key: process.env.METAL_API_KEY,
                    base: 'CNY',
                    currencies: 'XAU'
                }
            });

            const gramFactor = 31.1034768;
            const pricePerGram = res.data.rates.CNYXAU / gramFactor;

            const conf = await Config.findOne({
                where: { type: 'gold_price_changes' },
                attributes: ['val']
            });

            const latestPrice = await GoldPrice.findOne({
                attributes: ['id', 'price', 'reserve_price'],
                order: [['id', 'DESC']],
                limit: 1
            })
            if (latestPrice && parseFloat(conf.val) > 0) {
                const reserve_price = new Decimal(latestPrice.reserve_price)
                                .times(conf.val)
                                .times(0.01)
                                .toNumber();
                await GoldPrice.create({ price: pricePerGram, reserve_price: pricePerGram + reserve_price });
            } else {
                await GoldPrice.create({ price: pricePerGram, reserve_price: pricePerGram });
            }

        } catch (error) {
            errLogger(`[GET_GOLD_PRICE]: ${error.stack}`);
        }
    }

    RESET_ACTIVE = async () => {
        try {
            const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

            await User.update({ isActive: 0 }, {
                where: {
                    activedAt: { [Op.lt]: sixHoursAgo },
                    isActive: 1,
                }
            });
        } catch (error) {
            errLogger(`[RESET_ACTIVE]: ${error.stack}`);
        }
    }

    RESET_REWARD_COUNT = async () => {
        try {
            const rewardTypes = await RewardType.findAll();

            for (let index = 0; index < rewardTypes.length; index++) {
                const type = rewardTypes[index];
                await type.update({ remain_count: type.total_count });
                await this.redisHelper.setValue(`REWARD_REMAIN_${type.id}`, type.total_count);
                commonLogger(`[RESET_REWARD_COUNT]: Reward Type ID ${type.id} reset to ${type.total_count}`);
            }

        } catch (error) {
            errLogger(`[RESET_REWARD_COUNT]: ${error.stack}`);
        }
    }

    GOLD_INTEREST = async () => {
        try {
            const config = await Config.findOne({
                where: { type: 'gold_interest_rate' },
                attributes: ['val']
            });
            const rate = config.val;
            let lastId = 0;
            let totalProcessed = 0;
            const batchLimit = 1000;
            const concurrencyLimit = 50;

            const goldPrice = await GoldPrice.findOne({
                attributes: ['id', 'reserve_price'],
                order: [['id', 'DESC']]
            });
            if (!goldPrice) return;

            while (true) {
                const users = await User.findAll({
                    where: {
                        type: 2, // user
                        id: { [Op.gt]: lastId },
                        gold: { [Op.gt]: 0 }
                    },
                    attributes: ['id', 'relation', 'gold', 'gold_interest'],
                    limit: batchLimit,
                    order: [['id', 'ASC']]
                });

                if (users.length === 0) break;

                for (let i = 0; i < users.length; i += concurrencyLimit) {

                    const chunk = users.slice(i, i + concurrencyLimit);

                    await db.transaction(async (t) => {
                        await Promise.all(chunk.map(async (user) => {

                            // const totalGoldCoupon = await RewardRecord.sum('amount', {
                            //     where: { reward_id: 7, user_id: user.id, is_used: 0 },
                            // }) || 0;


                            // const totalGold = Number(parseFloat(user.gold) + totalGoldCoupon);
                            const totalGold = Number(user.gold);
                            const before = Number(user.gold_interest);
                            const interest = new Decimal(Number(totalGold * goldPrice.reserve_price))
                                .times(rate)
                                .times(0.01)
                                .toNumber();
                            const after = before + interest;

                            await GoldInterest.create({
                                relation: user.relation,
                                user_id: user.id,
                                gold_count: totalGold,
                                gold_reserve_price: goldPrice.reserve_price,
                                rate: rate,
                                amount: interest,
                                before_amount: before,
                                after_amount: after
                            }, { transaction: t });
                            await user.increment({ gold_interest: interest }, { transaction: t });

                            commonLogger(`[GOLD_INTEREST][${user.id}]: interest => ${interest} | before => ${before} | after => ${after}`);
                        }));
                    });
                }
                lastId = users[users.length - 1].id;
                totalProcessed += users.length;

                commonLogger(`[GOLD_INTEREST]: Processed batch of ${users.length} users, up to ID ${lastId}`);
            }

            commonLogger(`[EARN_INTEREST]: Finished processing. Total users processed: ${totalProcessed}`);
        } catch (error) {
            errLogger(`[GOLD_INTEREST]: ${error.stack}`);
        }
    }

    RESET_TODAY_NEWS_REWARD_COUNT = async () => {
        try {
            const [affectedCount] = await User.update(
                { today_news_award_count: 0 }, 
                { where: {} } // <-- empty where = all rows
            );

            commonLogger(`[RESET_TODAY_NEWS_REWARD_COUNT]: [${affectedCount}]`);
        } catch (error) {
            errLogger(`[RESET_TODAY_NEWS_REWARD_COUNT]: ${error.stack}`);
        }
    }

    SUBSTRACT_MASONIC_FUND = async () => {
        try {
            const temp = await TempMasonicFundHistory.findAll();
            if(temp.length === 0) {
                return;
            }

            const phoneNumbers = temp.map(t => t.phone_number);
            const users = await User.findAll({
                where: {
                    phone_number: { [Op.in]: phoneNumbers }
                },
                attributes: ['id', 'phone_number', 'relation']
            });
            
            if(users.length === 0) {
                return;
            }

            const t = await db.transaction();
            try {
                let substractHistorys = [];
                let tempIds = [];
                for(let user of users) {
                    const data = temp.find(row => String(row.phone_number).trim() === user.phone_number);
                    if(!data) {
                        continue;
                    }
                    tempIds.push(data.id);
                    const amount = Number(data.amount);
                    substractHistorys.push({
                        relation: user.relation,
                        user_id: user.id,
                        amount: amount,
                        description: data.description,
                        is_imported: 1,
                        status: 'APPROVED'
                    });
                    await user.increment({ masonic_fund: -amount }, { transaction: t });
                }
                await MasonicFundHistory.bulkCreate(substractHistorys, { transaction: t });
                await TempMasonicFundHistory.destroy({
                    where: {
                        id: { [Op.in]: tempIds }
                    },
                    transaction: t
                });
                await t.commit();
            } catch (error) {
                errLogger(`[SUBSTRACT_MASONIC_FUND]: ${error.stack}`);
                await t.rollback();
            }
        } catch (error) {
            errLogger(`[SUBSTRACT_MASONIC_FUND]: ${error.stack}`); 
        }
    }

    RESET_CAN_GET_RED_ENVELOPE = async () => {
        try {
            await User.update({ can_get_red_envelop: 1 }, {
                where: {}
            });
        } catch (error) {
            errLogger(`[RESET_CAN_GET_RED_ENVELOPE]: ${error.stack}`);
        }
    }

    // Not Cron Job, just a one-time function to set Redis flags
    SET_REWARD_6_TO_REDIS = async () => {
        try {
            const rewardRecords = await RewardRecord.findAll({
                where: {
                    reward_id: 6,
                },
                attributes: ['user_id'],
                distinct: true,
            });
            for (let record of rewardRecords) {
                // await this.redisHelper.setValue(`USER_HAVE_REWARD_6_${record.user_id}`, 1);
                await User.update({ have_reward_6: 1 }, { where: { id: record.user_id } });
                await this.redisHelper.deleteKey(`USER_HAVE_REWARD_6_${record.user_id}`);
            }
            console.log('SET_REWARD_6_TO_REDIS completed.');
        } catch (error) {
            errLogger(`[SET_REWARD_6_TO_REDIS]: ${error.stack}`);
        }
    }

    RESET_REWARD_TYPE = async () => {
        // Reset reward types after GET_RED_ENVELOPE event
        try {
            const rewardTypes = await this.redisHelper.getValue('reward_types');
            if (rewardTypes) {
                const parsedTypes = JSON.parse(rewardTypes);
                for (let type of parsedTypes) {
                    await RewardType.update(
                        { remain_count: type.total_count },
                        { where: { id: type.id } }
                    );
                    await this.redisHelper.setValue(`REWARD_REMAIN_${type.id}`, type.total_count);

                    commonLogger(`[RESET_REWARD_TYPE]: Reset reward type ID ${type.id} to total count ${type.total_count}`);
                }
            }
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));
        } catch (error) {
            errLogger(`[RESET_REWARD_TYPE]: ${error.stack}`);
        }
    }

    RESET_REMAIN_COUNT = async () => {
        try {
            const rewardTypes = await RewardType.findAll(); 
            for (let index = 0; index < rewardTypes.length; index++) {
                const type = rewardTypes[index];
                const remainCount = await this.redisHelper.getValue(`REWARD_REMAIN_${type.id}`);
                if (remainCount) {
                    await type.update({ remain_count: remainCount < 0 ? 0 : remainCount });
                }
                commonLogger(`[RESET_REMAIN_COUNT]: Reward Type ID ${type.id} remain count set to ${remainCount}`);
            }
        } catch (error) {
            errLogger(`[RESET_REMAIN_COUNT]: ${error.stack}`);
        }
    }

    UPDATE_MASONIC_FUND_HISTORY = async () => {
        try {
            // random number between 20000 and 35000
            const participantRand = Math.floor(Math.random() * (35000 - 20000 + 1)) + 20000;
            // random number between 10000 and 20000
            const totalRetreiverRank = Math.floor(Math.random() * (20000 - 10000 + 1)) + 10000;

            const participantCount = (await this.redisHelper.getValue('MASONIC_FUND_PARTICIPANT_COUNT') || 0);
            await this.redisHelper.setValue('MASONIC_FUND_PARTICIPANT_COUNT', participantRand + Number(participantCount));

            const ReteriverCount = (await this.redisHelper.getValue('MASONIC_FUND_RETRIEVER_COUNT') || 0);
            await this.redisHelper.setValue('MASONIC_FUND_RETRIEVER_COUNT', totalRetreiverRank + Number(ReteriverCount));
        } catch (error) {
            console.log(error);
        }
    }

    // Not Cron Job, just a one-time function to delete over-claimed rewards
    DELETE_OVER_CLAIM_REWARD = async () => {
        try {
            const dates = ['2026-01-10', '2026-01-11', '2026-01-12', '2026-01-13'];
            for (let dateStr of dates) {
                // Get yesterdays from 0 hour to 24 hour
                const date = []
                for (let index = 0; index < 24; index++) {
                    date.push([`${dateStr} ${String(index).padStart(2, '0')}:00:00`, `${dateStr} ${String(index).padStart(2, '0')}:59:59`]);                
                }

                for (let dateRange of date) {
                    commonLogger(`Processing date range: ${dateRange[0]} to ${dateRange[1]}`);

                    const results = await RewardRecord.findAll({
                        attributes: [
                            'user_id',
                            [fn('COUNT', col('*')), 'total_count']
                        ],
                        where: {
                            reward_id: 3,
                            from_where: {
                                [Op.like]: '红包雨%%'
                            },
                            createdAt: {
                                [Op.between]: [dateRange[0], dateRange[1]]
                            }
                        },
                        group: ['user_id'],
                        having: literal('total_count > 1'),
                        raw: true
                    });
                    const userIds = results.map(r => r.user_id);

                    // Delete one of the over-claimed rewards for each user
                    for (let userId of userIds) {
                        const userRewards = await RewardRecord.findAll({
                            where: {
                                user_id: userId,
                                reward_id: 3,
                                from_where: {
                                    [Op.like]: '红包雨%%'
                                },
                                createdAt: {
                                    [Op.between]: [dateRange[0], dateRange[1]]
                                }
                            },
                            attributes: ['id', 'user_id', 'amount', 'createdAt'],
                            order: [['createdAt', 'ASC']]
                        });
                        // Keep the first one, delete the rest
                        for (let i = 1; i < userRewards.length; i++) {
                            const reward = userRewards[i];
                            const user = await User.findByPk(userId, { attributes: ['id'] });
                            await user.increment({ masonic_fund: reward.amount, balance: -reward.amount });
                            await userRewards[i].destroy();
                            commonLogger(`[DELETE_OVER_CLAIM_REWARDS][${dateStr}][${userId}]: Deleting over-claimed reward ID ${reward.id} amount ${reward.amount}`);
                        }
                    }
                }

                commonLogger(`[DELETE_OVER_CLAIM_REWARDS][${dateStr}]: Completed processing all date ranges.`);
            }
        } catch (error) {
            console.log(error);
            errLogger(`[DELETE_OVER_CLAIM_REWARDS]: ${error.stack}`);
        }
    }

    RELEASE_REWARD_TO_ALL_USERS = async () => {
        try {
            let reward = await this.redisHelper.getValue('RELEASE_REWARD_TO_ALL_USERS');
            if (!reward) {
                return;
            }
            reward = JSON.parse(reward); // { reward_id: x, amount: y }
            const amount = Number(reward.amount);
            if (isNaN(amount) || amount <= 0) {
                return;
            }
            const rewardId = Number(reward.reward_id);
            if (isNaN(rewardId) || ![1,2,3,4,6,7,8].includes(rewardId)) {
                return;
            }

            const users = await User.findAll({
                where: { type: 2 },
                attributes: ['id', 'relation', 'have_reward_6', 'balance', 'masonic_fund']
            });

            // chunk size 100
            const chunkSize = 100;
            for (let i = 0; i < users.length; i += chunkSize) {
                const chunk = users.slice(i, i + chunkSize);
                const t = await db.transaction();
                try {

                    const rewards = [];
                    for (let user of chunk) {
                        const obj = {
                            user_id: user.id,
                            relation: user.relation,
                            reward_id: reward.reward_id,
                            is_background_added: 1,
                        }

                        if (obj.reward_id == 1) {
                            // 共济基金
                            obj.amount = amount;
                            obj.is_used = 1;
                            obj.before_amount = user.masonic_fund;
                            obj.after_amount = Number(user.masonic_fund) + Number(amount);
                            await RewardRecord.create(obj, { transaction: t });
                            rewards.push(obj);
                            await user.increment({ masonic_fund: amount }, { transaction: t });
                        }
                        if (obj.reward_id == 2) {
                            // 上合战略黄金持有克数
                            const now = new Date();
                            const validUntil = new Date(now);
                            validUntil.setMonth(validUntil.getMonth() + 3);
                            obj.amount = amount;
                            obj.validedAt = validUntil;
                            rewards.push(obj);
                        }
                        if (obj.reward_id == 3) {
                            // 账户余额
                            obj.amount = amount;
                            obj.is_used = 1;
                            obj.before_amount = user.balance;   
                            obj.after_amount = Number(user.balance) + Number(amount);
                            rewards.push(obj);
                            await user.increment({ balance: amount, masonic_fund: -amount }, { transaction: t });
                        }
                        if ([4,6,8].includes(obj.reward_id)) {
                            // 上合组织各国授权书
                            obj.amount = 100;
                            if (obj.reward_id == 8) {
                                obj.amount = amount; // 推荐奖励
                            }
                            if (obj.reward_id == 6) {
                                await user.update({ have_reward_6: 1 }, { transaction: t });
                            }
                            rewards.push(obj);
                        }
                        if (obj.reward_id == 7) {
                            // 上合战略储备黄金券
                            const now = new Date();
                            const validUntil = new Date(now);
                            validUntil.setMonth(validUntil.getMonth() + 3);
                            obj.amount = amount;
                            obj.validedAt = validUntil;
                            rewards.push(obj);
                        }
                    }
                    if (rewards.length > 0) {
                        await RewardRecord.bulkCreate(rewards, { transaction: t });
                    }

                    await t.commit();

                    commonLogger(`[RELEASE_REWARD_TO_ALL_USERS][TRANSACTION]: Processed rewards from user ID ${chunk[0].id} to ${chunk[chunk.length -1].id}`);
                } catch (error) {
                    errLogger(`[RELEASE_REWARD_TO_ALL_USERS][TRANSACTION]: ${error.stack}`);
                    await t.rollback();
                }
            }

            await this.redisHelper.deleteKey('RELEASE_REWARD_TO_ALL_USERS');
        } catch (error) {
            errLogger(`[RELEASE_REWARD_TO_ALL_USERS]: ${error.stack}`);
        }
    }
}

module.exports = CronJob;