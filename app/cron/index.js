const cron = require('node-cron');
const { User, Rank, UserKYC, db, Allowance, Config, Transfer, Interest, GoldPrice, RewardType, RewardRecord, GoldInterest, TempMasonicFundHistory, MasonicFundHistory, MasonicFund, UserSpringFestivalCheckInLog, UserSpringFestivalCheckIn, SpringWhiteList, Deposit, GoldPackageHistory, UserRankPoint, Withdraw, GoldPackageReturn, GoldPackageBonuses, GoldCouponTemp, AdminLog, BalanceTransfer, MasonicPackageBonuses, FederalReserveGoldPackageHistory, FederalReserveGoldPackageEarn } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const { commonLogger, errLogger, moneyTrackLogger } = require('../helpers/Logger');
const Decimal = require('decimal.js');
const axios = require('axios');
const RedisHelper = require('../helpers/RedisHelper');
const moment = require('moment');
const MasonicPackageHistory = require('../models/MasonicPackageHistory');
const MasonicPackageEarn = require('../models/MasonicPackageEarn');

class CronJob {
    constructor(app) {
        this.redisHelper = new RedisHelper(app);
        this.interval = null;
        this.getRandomInt = (min, max) => {
            return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
        }
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
        cron.schedule('30 23 * * *', this.CHECK_GOLD_PACKAGE_DAILY_RETURN).start();
        cron.schedule('20 0 * * *', this.GIVE_MASONIC_BONUS).start();
        // Every 10 minutes
        cron.schedule('*/10 * * * *', this.SUBSTRACT_MASONIC_FUND).start();
        // Run 10th minute of every hour
        cron.schedule('10 * * * *', this.RESET_REMAIN_COUNT).start();
        cron.schedule('10 * * * *', this.RELEASE_REWARD_TO_ALL_USERS).start();
        // Run Every Hour at minute 0
        cron.schedule('0 * * * *', this.UPDATE_MASONIC_FUND_HISTORY).start();
        // Run at 5th minute of every hour
        cron.schedule('5 * * * *', this.RUN_INTERVAL_RELEASE_RED_ENVELOP).start();
        // Run every 5 minutes
        cron.schedule('*/1 * * * *', this.GIVE_CHECK_IN).start();
        // Run every minute
        // cron.schedule('* * * * *', this.UPDATE_DEPOSIT_STATUS).start();
        cron.schedule('* * * * *', this.CHECK_GOLD_PACKAGE_REIMBURSEMENT).start(); // package_id 1 and 2 are eligible for reimbursement
        // Run at 30th minute of every hour
        // cron.schedule('30 * * * *', this.REFUND_WITHDRAW_AFTER_3_DAYS).start();
        cron.schedule('* * * * *', this.CHECK_FEDERAL_PACKAGE_REIMBURSEMENT).start();
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
                                    // await user.increment({ rank_allowance: totalAmount }, { transaction: t })
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

                            // await user.increment({ rank_allowance, freeze_allowance }, { transaction: t });
                            await user.increment({ freeze_allowance }, { transaction: t });
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
                attributes: ['id', 'price', 'reserve_price', 'createdAt'],
                order: [['id', 'DESC']],
                limit: 1
            })
            if (latestPrice && parseFloat(conf.val) > 0) {
                const reserve_price = new Decimal(latestPrice.reserve_price)
                                .times(conf.val)
                                .times(0.01)
                                .toNumber();
                const obj = {
                    price: pricePerGram, 
                    reserve_price: pricePerGram + reserve_price
                }
                if (moment(latestPrice.createdAt).isSame(moment(), 'day')) {
                    await latestPrice.update(obj);
                } else {
                    await GoldPrice.create({ price: pricePerGram, reserve_price: pricePerGram + reserve_price });
                }
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
                await User.update({ have_reward_6: 1, reward_6_from_where: 1 }, { where: { id: record.user_id } });
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

    GET_MISSING_DATES = (dates) => {
        try {
            const format = 'YYYY-MM-DD';

            const dateSet = new Set(dates);

            const start = moment(dates[0], format);
            const end = moment(dates[dates.length - 1], format);

            const missingDates = [];

            let current = start.clone();
            while (current.isSameOrBefore(end)) {
                const d = current.format(format);
                if (!dateSet.has(d)) {
                    missingDates.push(d);
                }
                current.add(1, 'day');
            }

            return missingDates;
        } catch (error) {
            return [];
        }
    }

    USER_DOWNLINE_LEVEL = async (userId, level = 3) => {
        try {
            const users = await User.findAll({ 
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    where: { status: 'APPROVED' },
                    attributes: []
                },
                where: { 
                    parent_id: userId,
                    createdAt: { 
                        [Op.between]: [this.eventStart, this.eventEnd]
                    }
                }, 
                attributes: ['id'] 
            });
            const userIds = users.map(u => {
                return u.id;
            });
            return userIds;
        } catch (error) {
            console.error('Error in USER_DOWNLINE_LEVEL:', error);
            errLogger(`[SpringFestivalEvent][USER_DOWNLINE_LEVEL]: ${error.stack}`);
            return [];
        }
    }

    GIVE_CHECK_IN = async () => {
        try {
            const phoneNumbers = await this.redisHelper.getValue('CHECK_IN_GIFT_PHONE_NUMBERS');
            if (!phoneNumbers) return;
            const eventStart = new Date('2026-02-05T00:00:00+08:00')
            const eventEnd = new Date('2026-02-25T23:59:59+08:00');

            const phoneNumberArr = JSON.parse(phoneNumbers);
            if (phoneNumberArr.length === 0) {
                await this.redisHelper.deleteKey('CHECK_IN_GIFT_PHONE_NUMBERS');
                return;
            }
                
            for (let phone of phoneNumberArr) {
                const user = await User.findOne({ 
                    where:  { phone_number: phone }, 
                    include: {
                        model: UserKYC,
                        as: 'kyc',
                        where: { status: 'APPROVED' },
                        attributes: []
                    },
                    attributes: ['id', 'relation'] 
                });
                if (!user) {
                    continue;
                }
                
                const checkInLogs = await UserSpringFestivalCheckInLog.findAll({
                    attributes: ['check_in_date'],
                    where: {
                        user_id: user.id,
                    }
                });
                const checkInDates = checkInLogs.map(log => {
                    return moment(log.check_in_date).format('YYYY-MM-DD');
                });
                const beforeStartDate = moment(eventStart).subtract(1, 'day').format('YYYY-MM-DD');
                checkInDates.unshift(beforeStartDate);
                checkInDates.push(moment(eventEnd).add(1, 'day').format('YYYY-MM-DD'));
    
                const missingDates = this.GET_MISSING_DATES(checkInDates);
                if (missingDates.length === 0) {
                    continue;
                }

                const checkInRecord = await UserSpringFestivalCheckIn.findOne({ where: { user_id: user.id } });
                if (!checkInRecord) {
                    continue;
                }
    
                const now = new Date();
                const whiteListUser = await SpringWhiteList.findOne({ where: { user_id: user.id } });
                
                const currentTime = moment().format('HH:mm:ss');

                const t = await db.transaction();
                try {
                    let totalCheckIn = checkInRecord.total_check_in;
                    for (let i = 0; i < missingDates.length; i++) {

                        totalCheckIn += 1;
                        const updateObj = {
                            total_check_in: totalCheckIn,
                            last_check_in_date: now
                        };

                        if (totalCheckIn == 7) {
                            updateObj.is_completed_7 = 1;
                            const amount = whiteListUser ? whiteListUser.day_7_rate : this.getRandomInt(20, 29);
                            const validUntil = new Date(eventStart);
                            // Valid At Feb 26, 2026 00:00:00 Beijing Time
                            validUntil.setDate(validUntil.getDate() + 21);

                            await RewardRecord.create({
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: 8, // 推荐金提取券
                                amount: amount,
                                from_where: '后台补签活动奖励',
                                validedAt: validUntil,
                                is_spring_festival_event: 1,
                                check_in_type: 1
                            }, { transaction: t });
                        }

                        if (totalCheckIn == 14) {
                            updateObj.is_completed_14 = 1;
                            if (whiteListUser && whiteListUser.is_check_downline_kyc == 0) {
                                const amount = whiteListUser.day_14_rate;
                                await RewardRecord.update({ amount: amount }, { 
                                    where: { user_id: user.id, is_spring_festival_event: 1, check_in_type: 1 },
                                    transaction: t, 
                                });
                            } else {
                                const downlineUsers = await this.USER_DOWNLINE_LEVEL(user.id, 3);
                                if (downlineUsers.length >= 10) {
                                    const amount = whiteListUser ? whiteListUser.day_14_rate : this.getRandomInt(30, 49);
                                    await RewardRecord.update({ amount: amount }, { 
                                        where: { user_id: user.id, is_spring_festival_event: 1, check_in_type: 1 },
                                        transaction: t, 
                                    });
                                }
                            }
                        }
                        if (totalCheckIn == 21) {
                            updateObj.is_completed_21 = 1;
                            if (whiteListUser && whiteListUser.is_check_downline_kyc == 0) {
                                const amount = whiteListUser.day_21_rate;
                                await RewardRecord.update({ amount: amount }, { 
                                    where: { user_id: user.id, is_spring_festival_event: 1, check_in_type: 1 },
                                    transaction: t 
                                });
                            } else {
                                const downlineUsers = await this.USER_DOWNLINE_LEVEL(user.id, 3);
                                if (downlineUsers.length >= 20) {
                                    const amount = whiteListUser ? whiteListUser.day_21_rate : this.getRandomInt(50, 60);   
                                    await RewardRecord.update({ amount: amount }, { 
                                        where: { user_id: user.id, is_spring_festival_event: 1, check_in_type: 1 },
                                        transaction: t 
                                    });
                                }
                            }
                        }

                        await UserSpringFestivalCheckInLog.create({
                            user_id: user.id,
                            relation: user.relation,
                            check_in_date: new Date(missingDates[i] + ' ' + currentTime),
                            is_background_added: 1
                        }, { transaction: t });

                        await checkInRecord.update(updateObj, { transaction: t });
                        console.log(`[GIVE_CHECK_IN][User ID: ${user.id}] Date ${missingDates[i]}`);
                    }

                    await t.commit();
                } catch (error) {
                    console.log(error);
                    errLogger(`[SpringFestivalEventController][GIVE_CHECK_IN][User ID: ${user.id}] ${error.stack}`);
                    await t.rollback();
                }
            }
            await this.redisHelper.deleteKey('CHECK_IN_GIFT_PHONE_NUMBERS');
        } catch (error) {
            console.log(error)
            errLogger(`[SpringFestivalEventController][GIVE_CHECK_IN] ${error.stack}`);
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
            if (isNaN(rewardId) || ![1,2,3,4,6,7,8,9].includes(rewardId)) {
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
                            reward_id: rewardId,
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
                        if ([4,6,8,9].includes(obj.reward_id)) {
                            // 上合组织各国授权书
                            obj.amount = 100;
                            if (obj.reward_id == 8 || obj.reward_id == 9) {
                                obj.amount = amount; // 推荐奖励
                            }
                            if (obj.reward_id == 6) {
                                await user.update({ have_reward_6: 1, reward_6_from_where: 1 }, { transaction: t });
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

    RELEASE_RED_ENVELOP = async (req, res) => {
        let userId = null;
        try {
            const QUEUE_KEY = 'QUEUE:RED_ENVELOP_POST_PROCESS';
            const item = await this.redisHelper.lPopValue(QUEUE_KEY);
            if (!item) {
                clearInterval(this.interval);
                this.interval = null;
                return;
            }
            const reward = JSON.parse(item);
            userId = reward.user_id;
            
            if (reward.reward_id == 5) {
                return;
            }

            const masonic_fund = reward.masonic_fund;
            const balance_fund = reward.balance_fund;
            const referral_fund = reward.referral_fund;
            const gold_fund = reward.gold_fund;
            const gold_gram = reward.gold_gram;
            const authorize_letter_amount = reward.authorize_letter_amount;
            const user = await User.findByPk(userId, { 
                attributes: ['id', 'masonic_fund', 'balance', 'relation'], 
                useMaster: userId % 2 === 0 ? true : false 
            });

            const obj = {
                user_id: userId,
                relation: user.relation,
                reward_id: reward.reward_id,
                amount: 0
            }
            if (reward.reward_id == 1) {
                obj.amount = masonic_fund;
                obj.before_amount = user.masonic_fund;
                obj.is_used = 1;
                obj.after_amount = parseFloat(user.masonic_fund) + parseFloat(masonic_fund);
                obj.from_where = `红包雨 共济基金 获得${masonic_fund}元`;
            } else if (reward.reward_id == 2) {
                obj.amount = gold_gram;
                const now = new Date();
                const validUntil = new Date(now);
                validUntil.setMonth(validUntil.getMonth() + 3);
                obj.validedAt = validUntil;
                obj.from_where = `红包雨 上合战略储备黄金券 获得${gold_gram}克`;
            } else if (reward.reward_id == 3) {
                obj.amount = balance_fund;
                obj.before_amount = user.balance;
                obj.is_used = 1;
                obj.after_amount = parseFloat(user.balance) + parseFloat(balance_fund);
                obj.from_where = `红包雨 余额 获得${balance_fund}元`;
            } else if (reward.reward_id == 6) {
                obj.amount = authorize_letter_amount;
                obj.from_where = `红包雨 上合组织中国区授权书 获得${authorize_letter_amount}`;
            } else if (reward.reward_id == 8) {
                obj.amount = referral_fund;
                obj.from_where = `红包雨 推荐金提取券 获得${referral_fund}元`;
            } else if (reward.reward_id == 7) {
                obj.amount = gold_fund;
                obj.from_where = `红包雨 上合战略储备黄金券 获得${gold_fund}克`;
                const now = new Date();
                const validUntil = new Date(now);
                validUntil.setMonth(validUntil.getMonth() + 3);
                obj.validedAt = validUntil;
            }

            let t;
            try {
                t = await db.transaction();
                
                await RewardRecord.create(obj, { transaction: t });

                if (masonic_fund > 0) {
                    await user.increment({ masonic_fund: masonic_fund }, { transaction: t });
                } else if (balance_fund > 0) {
                    await user.increment({ balance: balance_fund, masonic_fund: -balance_fund }, { transaction: t });
                }
                if (reward.total_reward == reward.limit) {
                    await user.update({ can_get_red_envelop: 0 }, { transaction: t });
                }

                // Set flag for reward 6 to prevent duplicate wins
                if (reward.reward_id == 6) {
                    await user.update({ have_reward_6: 1, reward_6_from_where: 1 }, { transaction: t });
                }
                
                reward.remain_count = reward.reward_remain_count - 1;
                let rewardTypes = await this.redisHelper.getValue('reward_types');
                if (rewardTypes) {
                    rewardTypes = JSON.parse(rewardTypes);
                } else {
                    rewardTypes = await RewardType.findAll({});
                }
                const currentRewardIndex = rewardTypes.findIndex(r => r.id == reward.reward_id);
                rewardTypes[currentRewardIndex].remain_count = reward.remain_count;
                await this.redisHelper.setValue('reward_types', JSON.stringify(rewardTypes));

                const todayKey = `WIN_COUNT_${userId}_${moment().format('YYYYMMDD')}`;
                // Expiry at midnight
                const now = new Date();
                const expireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
                const ttlInSeconds = Math.floor((expireAt - now) / 1000);
                await this.redisHelper.setValue(todayKey, String(reward.total_reward), ttlInSeconds);

                const remainKey = `REWARD_REMAIN_${reward.reward_id}`;
                if ([1,3].includes(reward.reward_id)) {
                    await this.redisHelper.setValue(remainKey, String(reward.remain_count - obj.amount));
                } else {
                    await this.redisHelper.decrementValue(remainKey);
                }
                
                await t.commit();
            } catch (error) {
                errLogger(`[RELEASE_RED_ENVELOP][DB Transaction Error]
                    name: ${error.name}
                    message: ${error.message}
                    sql: ${error.sql || 'N/A'}
                    stack: ${error.stack}
                `);
                // Only rollback if transaction exists and hasn't been committed
                if (t && !t.finished) {
                    try {
                        await t.rollback();
                    } catch (rollbackError) {
                        errLogger(`[RELEASE_RED_ENVELOP][Rollback Error][${userId}]: ${rollbackError.stack}`);
                    }
                }
                return errLogger(`[RELEASE_RED_ENVELOP][Transaction Rolled Back][${userId}]`);
            }

            // Clean up Redis key after successful commit (outside transaction block)
            try {
                await this.redisHelper.deleteKey(`UID_${userId}_reward`);
            } catch (redisError) {
                // Log but don't fail the response since DB transaction is already committed
                errLogger(`[RELEASE_RED_ENVELOP][Redis cleanup error][${userId}]: ${redisError.stack}`);
            }

            commonLogger(`[RELEASE_RED_ENVELOP][${userId}]: Successfully released red envelope reward[${reward.reward_id}].`);
        } catch (error) {
            errLogger(`[RELEASE_RED_ENVELOP][${userId}]: ${error.stack}`);
        }
    }

    RUN_INTERVAL_RELEASE_RED_ENVELOP = () => {
        if (this.interval) return;
        let running = false;

        this.interval = setInterval(async () => {
            if (running) return;
            running = true;
            try {
                await this.RELEASE_RED_ENVELOP();
            } finally {
                running = false;
            }
        }, 10);
    }

    UPDATE_DEPOSIT_STATUS = async () => {
        try {
            // Update deposits that are still pending for more than 30 minutes to failed
            const thirtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
            await Deposit.update(
                { status: 2 },
                { 
                    where: { 
                        status: 0, 
                        createdAt: { [Op.lt]: thirtyMinutesAgo } 
                    } 
                }
            );
        } catch (error) {
            errLogger(`[UPDATE_DEPOSIT_STATUS]: ${error.stack}`); 
        }
    }

    // Not cron job
    TRANSFER_RESERVE_TO_BALANCE = async () => {
        try {
            const records = await Transfer.findAll({
                attributes: ['id', 'user_id', 'amount', 'before_from_amount', 'after_from_amount', 'before_to_amount', 'after_to_amount'],
                where: {
                    wallet_type: 3, // 推荐金
                    reward_id: 8, // 推荐金提取券
                    from: 3, // 推荐金
                    to: 1, // 储备金
                    createdAt: {
                        [Op.gt]: '2026-02-26 00:00:00',
                    }
                }
            });
            for (let record of records) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(record.user_id, { 
                        attributes: ['id', 'balance', 'reserve_fund'], 
                        transaction: t 
                    });
                    if (!user || Number(user.reserve_fund) != Number(record.amount)) {
                        await t.rollback();
                        continue;
                    }
                    await user.increment({ balance: Number(record.amount), reserve_fund: -Number(record.amount) }, { transaction: t });
                    await record.update({ 
                        wallet_type: 3, 
                        from: 3, 
                        to: 2,
                        before_to_amount: user.balance,
                        after_to_amount: Number(user.balance) + Number(record.amount),
                    }, { transaction: t });
                    await t.commit();
                } catch (error) {
                    errLogger(`[TRANSFER_RESERVE_TO_BALANCE][Transaction Error][Record ID: ${record.id}]: ${error.stack}`);
                    if (t && !t.finished) {
                        try {
                            await t.rollback();
                        } catch (rollbackError) {
                            errLogger(`[TRANSFER_RESERVE_TO_BALANCE][Rollback Error][Record ID: ${record.id}]: ${rollbackError.stack}`);
                        }
                    }
                }
            }
        } catch (error) {
            errLogger(`[TRANSFER_RESERVE_TO_BALANCE]: ${error.stack}`);
        }
    }

    CHECK_GOLD_PACKAGE_REIMBURSEMENT = async () => {
        try {
            const now = new Date();
            const packages = await GoldPackageHistory.findAll({
                where: {
                    package_id: { [Op.in]: [1, 2] },
                    reimbursement_date: {
                        [Op.lte]: now
                    },
                    is_reimbursed: 0
                },
                attributes: ['id', 'user_id', 'package_id', 'price', 'reimbursement_rate']
            });

            const t = await db.transaction();
            try {
                for (let pack of packages) {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'balance'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const reimbursementAmount = new Decimal(Number(pack.price))
                        .times(Number(pack.reimbursement_rate))
                        .times(0.01)
                        .toNumber();
                    if (reimbursementAmount > 0) {
                        await user.increment({ balance: reimbursementAmount }, { transaction: t });
                        await pack.update({ is_reimbursed: 1 }, { transaction: t });
                        await GoldPackageReturn.create({
                            user_id: user.id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: reimbursementAmount,
                            description: '礼包报销返还',
                        }, { transaction: t });
                    }
                }

                await t.commit();
            } catch (error) {
                errLogger(`[CHECK_GOLD_PACKAGE_REIMBURSEMENT][Transaction Error]: ${error.stack}`);
                await t.rollback();
            }

        } catch (error) {
            errLogger(`[CHECK_GOLD_PACKAGE_REIMBURSEMENT]: ${error.stack}`);
        }
    }

    CHECK_GOLD_PACKAGE_DAILY_RETURN = async () => {
        try {
            const now = new Date();

            const packages = await GoldPackageHistory.findAll({
                where: {
                    package_id: { [Op.in]: [3, 4, 5] },
                    validUntil: {
                        [Op.gte]: now
                    },
                },
                attributes: ['id', 'user_id', 'package_id', 'price']
            });

            const t = await db.transaction();
            try {
                for (let pack of packages) {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'balance'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const dailyReward = new Decimal(Number(pack.price))
                        .times(0.01) // 1% daily reward
                        .toNumber();
                    if (dailyReward > 0) {
                        await user.increment({ balance: dailyReward }, { transaction: t });
                        await GoldPackageReturn.create({
                            user_id: user.id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: dailyReward,
                            description: '礼包每日储备收益',
                        }, { transaction: t });
                    }
                }

                await t.commit();
            } catch (error) {
                errLogger(`[CHECK_GOLD_PACKAGE_DAILY_RETURN][Transaction Error]: ${error.stack}`);
                await t.rollback();
            }

        } catch (error) {
            errLogger(`[CHECK_GOLD_PACKAGE_DAILY_RETURN]: ${error.stack}`); 
        }
    }

    // Not cron job => Pay rank point to every users for kyc approval
    PAY_RANK_POINT = async () => {
        try {
            const batchSize = 500;
            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const users = await User.findAll({
                    where: { type: 2 },
                    include: {
                        model: UserKYC,
                        as: 'kyc',
                        where: { status: 'APPROVED' },
                        attributes: []
                    },
                    attributes: ['id', 'relation'],
                    limit: batchSize,
                    offset: offset
                });
                if (users.length < batchSize) {
                    hasMore = false;
                } else {
                    offset += batchSize;
                }

                // const t = await db.transaction();
                await db.transaction(async (t) => {
                    for (let user of users) {
                        // Give Rank Points to all uplines based on relation path
                        // /1/2/7/10/12/13/14
                        const rankPointRelationArr = user.relation ? user.relation.split("/").filter(v => v).slice(1, -1).map(Number) : [];
                        const rankPointRelArr = rankPointRelationArr.reverse(); // [13,12,10,7,2]

                        if (rankPointRelArr.length === 0) continue;
                        
                        const levelAmounts = [10, 5, 1]; // First three levels
                        const defaultAmount = 0.5;       // Remaining levels
                        
                        const parents = await User.findAll({
                            where: {
                                id: { [Op.in]: rankPointRelArr },
                                type: 2 // only User type can get rank points
                            },
                            attributes: ['id', 'relation']
                        });

                        const rankPoints = [];
                        const parentMap = new Map(parents.map(p => [p.id, p]));
                        const parentUpdates = {};

                        for (let i = 0; i < rankPointRelArr.length; i++) {
                            const parentId = rankPointRelArr[i];
                            const amount = levelAmounts[i] ?? defaultAmount;
                            // const parent = parents.find(p => p.id == parentId);
                            const parent = parentMap.get(String(parentId));
                            if (!parent) continue;

                            rankPoints.push({ type: 1, from: user.id, to: parentId, amount, relation: parent.relation });
                            parentUpdates[parentId] = (parentUpdates[parentId] || 0) + amount;
                            
                        }
                        // Bulk create all rank points at once
                        if (rankPoints.length > 0) {
                            await UserRankPoint.bulkCreate(rankPoints, { transaction: t });
                        }
                        for (const [id, amount] of Object.entries(parentUpdates)) {
                            await User.increment(
                                { rank_point: amount },
                                { where: { id }, transaction: t }
                            );
                        }
                    }
                });
                console.log(`[PAY_RANK_POINT][Batch Processed]: Processed users from offset ${offset} to ${offset + users.length}`);
            }

            commonLogger('[PAY_RANK_POINT]: Completed processing all users for rank points.');
            
        } catch (error) {
            errLogger(`[PAY_RANK_POINT]: ${error.stack}`);
        }
    }

    // Not cron job => Give Authorization Letter
    GIVE_AUTHORIZATION_LETTER = async () => {
        try {
            const users = await User.findAll({
                attributes: ['id', 'relation'],
                where: {
                    reward_6_from_where: 2
                }
            });
            console.log(users.length)

            const t = await db.transaction();
            try {
                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    const masonicFund = await MasonicFundHistory.findOne({
                        attributes: ['id'],
                        where: { user_id: user.id }
                    });
                    const obj = {
                        user_id: user.id,
                        relation: user.relation,
                        reward_id: 6,
                        amount: 100,
                        from_where: `购买上合组织中国区授权书`,
                        is_used: masonicFund ? 1 : 0
                    }
                    console.log(obj)
                    await RewardRecord.create(obj, { transaction: t });
                }
                await t.commit();
            } catch (error) {
                errLogger(`[GIVE_AUTHORIZATION_LETTER]: ${error.stack}`);
                await t.rollback();
            }
            
        } catch (error) {
            errLogger(`[GIVE_AUTHORIZATION_LETTER]: ${error.stack}`);
        }
    }

    REFUND_WITHDRAW_AFTER_3_DAYS = async () => {
        try {
            const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
            const withdraws = await Withdraw.findAll({
                where: {
                    status: 0,
                    createdAt: { [Op.lt]: threeDaysAgo }
                },
                attributes: ['id', 'user_id', 'amount']
            });
            console.log(`[REFUND_WITHDRAW_AFTER_3_DAYS]: Found ${withdraws.length} withdraw(s) to refund.`);

            const t = await db.transaction();
            try {
                for (let withdraw of withdraws) {
                    const user = await User.findByPk(withdraw.user_id, { attributes: ['id', 'balance'], transaction: t });
                    if (!user) continue;
                    await user.increment({ balance: Number(withdraw.amount) }, { transaction: t });
                    await withdraw.update({ status: 2, description: 'CRON REFUND' }, { transaction: t });
                    console.log(`[REFUND_WITHDRAW_AFTER_3_DAYS][Withdraw ID: ${withdraw.id}]: Refunded ${withdraw.amount} to user ID ${user.id}`);
                }
                await t.commit();
            } catch (error) {                
                errLogger(`[REFUND_WITHDRAW_AFTER_3_DAYS][Transaction Error]: ${error.stack}`);
                await t.rollback();
            }
        } catch (error) {
            errLogger(`[REFUND_WITHDRAW_AFTER_3_DAYS]: ${error.stack}`);
        }
    }

    REJECT_ALL_PENDING_WITHDRAW = async () => {
        try {
            const withdraws = await Withdraw.findAll({
                where: {
                    status: 0,
                },
                attributes: ['id', 'user_id', 'amount']
            })

            const t = await db.transaction();
            try {
                for (let withdraw of withdraws) {
                    const user = await User.findByPk(withdraw.user_id, { attributes: ['id', 'balance'], transaction: t });
                    if (!user) continue;
                    await user.increment({ balance: Number(withdraw.amount) }, { transaction: t });
                    await withdraw.update({ status: 2, description: 'CRON REFUND' }, { transaction: t });
                    console.log(`[REJECT_ALL_PENDING_WITHDRAW][Withdraw ID: ${withdraw.id}]: Refunded ${withdraw.amount} to user ID ${user.id}`);
                }
                await t.commit();
            } catch (error) {
                errLogger(`[REJECT_ALL_PENDING_WITHDRAW][Transaction Error]: ${error.stack}`);
                await t.rollback();
            }
        } catch (error) {
            errLogger(`[REJECT_ALL_PENDING_WITHDRAW]: ${error.stack}`);
        }
    }

    GIVE_MASONIC_BONUS = async () => {
        // 1%
        try {

            const today = moment().format('YYYY-MM-DD');
            const packages = await MasonicPackageHistory.findAll({
                attributes: ['id', 'user_id', 'package_id', 'price', 'daily_earn', 'createdAt'],
                where: {
                    createdAt: {
                        [Op.lt]: `${today} 00:00:00`
                    }
                }
            });

            for (let pack of packages) {
                // daily_earn is can be get on the next day after the package is bought, so only give bonus when createdAt is before today
                // if (moment(pack.createdAt).isAfter(moment().startOf('day'))) {
                //     continue;
                // }

                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'balance', 'relation'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    // const dailyReward = new Decimal(Number(pack.price))
                    //     .times(0.01) // 1% daily reward
                    //     .toNumber();
                    // if (dailyReward > 0) {
                    //     await user.increment({ balance: dailyReward }, { transaction: t });
                    //     await MasonicPackageEarn.create({
                    //         user_id: user.id,
                    //         relation: user.relation,
                    //         package_id: pack.package_id,
                    //         package_history_id: pack.id,
                    //         amount: dailyReward,
                    //         description: '共计资金礼包每日收益',
                    //     }, { transaction: t });
                    // }

                    // const existEarn = await MasonicPackageEarn.findOne({
                    //     where: {
                    //         package_history_id: pack.id,
                    //         user_id: pack.user_id,
                    //         createdAt: {
                    //             [Op.between]: ['2026-04-18 00:00:00', '2026-04-18 23:59:59']
                    //         }
                    //     },
                    //     transaction: t
                    // });

                    // if (existEarn) {
                    //     await t.rollback();
                    //     continue;
                    // }

                    await user.increment({ balance: pack.daily_earn }, { transaction: t });
                    await MasonicPackageEarn.create({
                        user_id: user.id,
                        relation: user.relation,
                        package_id: pack.package_id,
                        package_history_id: pack.id,
                        amount: pack.daily_earn,
                        description: '共计资金礼包每日收益',
                    }, { transaction: t });

                    await t.commit();

                    console.log(`[GIVE_MASONIC_BONUS][Package ID: ${pack.id}]: Given daily earn ${pack.daily_earn} to user ID ${user.id}`);
                } catch (error) {
                    errLogger(`[GIVE_MASONIC_BONUS][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }
            }

            console.log(`[GIVE_MASONIC_BONUS]: Completed processing all packages for daily bonus.`);
        } catch (error) {
            errLogger(`[GIVE_MASONIC_BONUS]: ${error.stack}`); 
        }
    }

    RECALL_MASONIC_BONUS = async () => {
        try {
            const today = moment().format('YYYY-MM-DD');
            const earns = await MasonicPackageEarn.findAll({
                attributes: ['id', 'user_id', 'package_id', 'amount', 'createdAt'],
                where: {
                    createdAt: {
                        [Op.gt]: `${today} 00:00:00`
                    }
                }
            });

            for (let earn of earns) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(earn.user_id, { attributes: ['id', 'balance', 'relation'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    if (Number(user.balance) < Number(earn.amount)) {
                        moneyTrackLogger(`[RECALL_MASONIC_BONUS][Earn ID: ${earn.id}]: User ID ${user.id} has balance ${user.balance} which is less than earn amount ${earn.amount}. Cannot recall this earn record.`);
                        await t.rollback();
                        continue;
                    }
                    await user.increment({ balance: -Number(earn.amount) }, { transaction: t });
                    await earn.update({ description: 'CRON RECALL' }, { transaction: t });
                    console.log(`[RECALL_MASONIC_BONUS][Earn ID: ${earn.id}]: Recalled ${earn.amount} from user ID ${user.id}`);
                    await t.commit();
                }
                catch (error) {
                    moneyTrackLogger(`[RECALL_MASONIC_BONUS][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }
            }
        } catch (error) {
            moneyTrackLogger(`[RECALL_MASONIC_BONUS]: ${error.stack}`);
        }
    }

    RECALL_GOLD_COUPON_TEMP = async () => {
        try {
            const rewardGroup = await RewardRecord.findAll({
                where: {
                    reward_id: 7,
                    is_used: 1
                },
                attributes: ['user_id'],
                group: ['user_id']
            });

            const chunkSize = 100;
            for (let i = 0; i < rewardGroup.length; i += chunkSize) {
                const chunk = rewardGroup.slice(i, i + chunkSize);
                
                for (let group of chunk) {
                    const rewards = await RewardRecord.findAll({
                        where: {
                            user_id: group.user_id,
                            reward_id: 7,
                            is_used: 1,
                            user_id: group.user_id,
                            validedAt: {
                                [Op.lte]: new Date()
                            }
                        },
                        attributes: ['id', 'user_id', 'amount', 'updatedAt', 'validedAt'],
                    });

                    let totalGoldValue = 0;
                    for (let i = 0; i < rewards.length; i++) {
                        const reward = rewards[i];
                        const date = moment(reward.validedAt).format('YYYY-MM-DD');
                        const goldPrice = await GoldPrice.findOne({
                            where: {
                                createdAt: {
                                    [Op.gte]: `${date} 00:00:00`,
                                    [Op.lte]: `${date} 23:59:59`
                                }
                            },
                            attributes: ['id', 'reserve_price'],
                            order: [['createdAt', 'DESC']],
                        });

                        const goldValue = new Decimal(reward.amount * goldPrice.reserve_price)
                            .times(80) // 80% [八折兑换为余额]
                            .times(0.01)
                            .toNumber();

                        totalGoldValue += goldValue;
                    }

                    for (let reward of rewards) {
                        const t = await db.transaction();
                        try {
                            const user = await User.findByPk(reward.user_id, { attributes: ['id', 'balance', 'reserve_fund'], transaction: t });
                            
                            const withdraws = await Withdraw.findAll({
                                where: {
                                    user_id: reward.user_id,
                                    status: 0,
                                    createdAt: {
                                        [Op.gt]: moment(rewards[0].validedAt).add(3, 'months').toDate(),
                                    }
                                },
                                attributes: ['id', 'amount'],
                                transaction: t
                            });
                            if (withdraws.length > 0) {
                                let returnAmount = 0;
                                for (const withdraw of withdraws) {
                                    returnAmount += Number(withdraw.amount);
                                    await withdraw.update({ status: 2, description: '黄金券入库' }, { transaction: t });
                                    await GoldCouponTemp.create({
                                        user_id: reward.user_id,
                                        reward_record_id: reward.id,
                                        model: 'Withdraw',
                                        content: withdraw.get({ plain: true }),
                                    }, { transaction: t });
                                }

                                const remainBalance = new Decimal(user.balance).plus(returnAmount).toNumber();
                                const realRemainBalance = new Decimal(remainBalance).minus(totalGoldValue).toNumber();
                                console.log("Real Remain Balance **************", realRemainBalance);
                                if (realRemainBalance >= 0) {
                                    await GoldCouponTemp.create({
                                        user_id: reward.user_id,
                                        reward_record_id: reward.id,
                                        model: 'User',
                                        content: {
                                            before_balance: user.balance,
                                            return_amount: returnAmount,
                                            gold_count: Number(reward.amount),
                                            gold_value: totalGoldValue,
                                            after_balance: realRemainBalance,
                                        },
                                    }, { transaction: t });
                                    await user.update({ balance: realRemainBalance }, { transaction: t });
                                } else {
                                    console.log(`User ID ${user.id} does not have enough balance to cover the gold coupon after returning withdraws. Skipping this reward record.`);
                                    await t.rollback();
                                    continue;
                                }
                            }
                            
                            const goldPackages = await GoldPackageHistory.findAll({
                                where: {
                                    user_id: reward.user_id,
                                    createdAt: {
                                        [Op.gte]: moment(rewards[0].validedAt).add(3, 'months').toDate(),
                                    }
                                },
                                attributes: ['id', 'price'],
                            });
                            for (const pack of goldPackages) {
                                const bonuses = await GoldPackageBonuses.findAll({
                                    where: {
                                        from_user_id: reward.user_id,
                                        createdAt: {
                                            [Op.gte]: moment(rewards[0].validedAt).add(3, 'months').toDate(),
                                        }
                                    },
                                    attributes: ['id', 'amount', 'user_id'],
                                });

                                await GoldCouponTemp.create({
                                    user_id: reward.user_id,
                                    reward_record_id: reward.id,
                                    model: 'GoldPackageHistory',
                                    content: pack.get({ plain: true }),
                                }, { transaction: t });
                                await pack.destroy({ transaction: t });

                                for (const bonus of bonuses) {

                                    const parentUser = await User.findByPk(bonus.user_id, { attributes: ['id', 'balance', 'reserve_fund'], transaction: t });
                                    // 
                                    if (parentUser && Number(parentUser.balance) >= Number(bonus.amount)) {
                                        await parentUser.increment({ balance: -Number(bonus.amount) }, { transaction: t });
                                    } else {
                                        const withdraw = await Withdraw.findOne({
                                            where: {
                                                user_id: bonus.user_id,
                                                status: 0,
                                            },
                                            attributes: ['id', 'amount'],
                                            transaction: t
                                        });
                                        if (withdraw) {
                                            if ((Number(withdraw.amount) + Number(parentUser.balance)) > bonus.amount) {
                                                const parentRemainBalance = new Decimal(parentUser.balance).plus(withdraw.amount).minus(bonus.amount).toNumber();

                                                await GoldCouponTemp.create({
                                                    user_id: bonus.user_id,
                                                    reward_record_id: reward.id,
                                                    model: 'Withdraw',
                                                    content: withdraw.get({ plain: true }),
                                                }, { transaction: t });

                                                await GoldCouponTemp.create({
                                                    user_id: bonus.user_id,
                                                    reward_record_id: reward.id,
                                                    model: 'User',
                                                    content: {
                                                        type: 'parent',
                                                        before_balance: parentUser.balance,
                                                        return_amount: withdraw.amount,
                                                        after_balance: parentRemainBalance,
                                                    },
                                                }, { transaction: t });

                                                await withdraw.update({ status: 2, description: 'Not Enought To Substract' }, { transaction: t });
                                                await parentUser.update({ balance: parentRemainBalance }, { transaction: t });
                                            }
                                        } else {
                                            if ((Number(parentUser.reserve_fund) + Number(parentUser.balance)) > bonus.amount) {
                                                const parentRemainBalance = new Decimal(parentUser.balance).plus(parentUser.reserve_fund).minus(bonus.amount).toNumber();

                                                await GoldCouponTemp.create({
                                                    user_id: bonus.user_id,
                                                    reward_record_id: reward.id,
                                                    model: 'User',
                                                    content: {
                                                        type: 'parent',
                                                        before_balance: parentUser.balance,
                                                        reserve_fund: parentUser.reserve_fund,
                                                        after_balance: parentRemainBalance,
                                                    },
                                                }, { transaction: t });

                                                await parentUser.update({ balance: parentRemainBalance, reserve_fund: 0 }, { transaction: t });

                                                const tr = await Transfer.create({
                                                    user_id: parentUser.id,
                                                    wallet_type: 2,
                                                    amount: parentUser.reserve_fund,
                                                    from: 2,
                                                    to: 1,
                                                    before_from_amount: parentUser.reserve_fund,
                                                    after_from_amount: 0,
                                                    before_to_amount: parentUser.balance,
                                                    after_to_amount: parentRemainBalance,
                                                    status: 'APPROVED'
                                                }, { transaction: t });

                                                await GoldCouponTemp.create({
                                                    user_id: bonus.user_id,
                                                    reward_record_id: reward.id,
                                                    model: 'Transfer',
                                                    content: tr.get({ plain: true }),
                                                }, { transaction: t });
                                            }
                                        }
                                    }
                                    await GoldCouponTemp.create({
                                        user_id: bonus.user_id,
                                        reward_record_id: reward.id,
                                        model: 'GoldPackageBonuses',
                                        content: bonus.get({ plain: true }),
                                    }, { transaction: t });
                                    await bonus.destroy({ transaction: t });
                                }
                            }

                            if (withdraws.length === 0 && goldPackages.length === 0) {
                                const remainBalance = new Decimal(user.balance).minus(totalGoldValue).toNumber();
                                if (remainBalance >= 0) {
                                    await GoldCouponTemp.create({
                                        user_id: reward.user_id,
                                        reward_record_id: reward.id,
                                        model: 'User',
                                        content: {
                                            before_balance: user.balance,
                                            gold_count: Number(reward.amount),
                                            gold_value: totalGoldValue,
                                            after_balance: remainBalance,
                                        },
                                    }, { transaction: t });

                                    await user.update({ balance: remainBalance }, { transaction: t });
                                }
                            }

                            await reward.update({ is_used: 0, description: '黄金券入库', updatedAt: reward.updatedAt }, { transaction: t });

                            const transfers = await Transfer.findAll({
                                where: {
                                    user_id: reward.user_id,
                                    createdAt: {
                                        [Op.gt]: rewards[0].updatedAt,
                                    }
                                },
                                transaction: t
                            });

                            if (transfers.length > 0) {
                                for (const tr of transfers) {
                                    await GoldCouponTemp.create({
                                        user_id: reward.user_id,
                                        reward_record_id: reward.id,
                                        model: 'Transfer',
                                        content: tr.get({ plain: true }),
                                    }, { transaction: t });
                                }
                            }

                            console.log(`[RECALL_GOLD_COUPON_TEMP][Reward Record ID: ${reward.id}]: Processed reward for user ID ${reward.user_id}`);
                            await t.commit();
                        } catch (error) {
                            errLogger(`[RECALL_GOLD_COUPON_TEMP][Transaction Error]: ${error.stack}`);
                            await t.rollback();
                        }
                    }
                }
            }

        } catch (error) {
            errLogger(`[RECALL_GOLD_COUPON_TEMP]: ${error.stack}`); 
        }
    }

    UPDATE_BALANCE = async (userId) => {
        try {
            const user = await User.findByPk(userId, { attributes: ['id', 'phone_number', 'balance', 'reserve_fund'] });
            moneyTrackLogger(`*****[OriginUser]******: ${JSON.stringify(user)}`);

            let totalBalance = 0;

            // 红包雨奖励
            const reward3Amount = await RewardRecord.sum('amount', {
                where: { user_id: user.id, reward_id: 3 }
            }) || 0;
            totalBalance += Number(reward3Amount);

            // Transfer [转账] 2 => 1
            const transfer21 = await Transfer.sum('amount', {
                where: {
                    user_id: user.id,
                    wallet_type: 2,
                    from: 2,
                    to: 1, // Reserve
                    createdAt: {
                        [Op.lte]: '2026-04-10 00:00:00'
                    }
                }
            }) || 0;
            totalBalance -= Number(transfer21);
            
            // Transfer [转账] 1 => 2
            const transfer12 = await Transfer.sum('amount', {
                where: {
                    user_id: user.id,
                    wallet_type: 1,
                    from: 1,
                    to: 2,
                    createdAt: {
                        [Op.lte]: '2026-04-10 00:00:00'
                    }
                }
            }) || 0;
            totalBalance += Number(transfer12);

            // 推荐金提取券
            const transfers = await Transfer.sum('amount', {
                where: { reward_id: 8, user_id: user.id },
            }) || 0;
            totalBalance += Number(transfers)

            // Gold Package Return
            const goldPackageReturns = await GoldPackageReturn.sum('amount', {
                where: { user_id: user.id }
            }) || 0;
            totalBalance += Number(goldPackageReturns);

            // Buy Gold Package Bonus [购买黄金礼包奖励]
            const goldPackageBonuses = await GoldPackageBonuses.sum('amount', {
                where: { user_id: user.id }
            }) || 0;
            totalBalance += Number(goldPackageBonuses);

            // Withdraws
            const withdraws = await Withdraw.findAll({
                where: {
                    user_id: user.id,
                    createdAt: {
                        [Op.lte]: '2026-04-10 00:00:00'
                    }
                },
                attributes: ['id', 'amount', 'status']
            });
            const thousand1000Arr = [];
            for (let index = 0; index < withdraws.length; index++) {
                const wd = withdraws[index];

                if (Number(wd.amount) == 1000) {
                    thousand1000Arr.push(wd);
                    continue;
                }
                
                totalBalance -= Number(wd.amount);

                const status = Number(wd.status);
                const amount = Number(wd.amount);

                if (status === 2) {
                    totalBalance += amount;
                } else if (status === 0) {
                    moneyTrackLogger(`Pending Withdraw ID ${wd.id} with amount ${amount} will be treated as rejected for balance calculation.`);
                    await wd.update({ status: 2, description: 'RESET BALANCE' });
                    totalBalance += amount;
                }
            }

            if (thousand1000Arr.length > 1) {
                for (let index = 1; index < thousand1000Arr.length; index++) {
                    
                    const wd = thousand1000Arr[index];

                    totalBalance -= Number(wd.amount);

                    const status = Number(wd.status);
                    const amount = Number(wd.amount);

                    if (status === 2) {
                        totalBalance += amount;
                    } else if (status === 0) {
                        moneyTrackLogger(`Pending Withdraw ID ${wd.id} with amount ${amount} will be treated as rejected for balance calculation.`);
                        await wd.update({ status: 2, description: 'RESET BALANCE' });
                        totalBalance += amount;
                    }
                }
            }

            // Authorization Letter [授权书]
            const letter = await RewardRecord.findOne({
                where: { user_id: user.id, reward_id: 6 },
                attributes: ['id', 'is_used', 'createdAt', 'updatedAt']
            });
            if (letter && letter.is_used) {
                totalBalance += 100;
                moneyTrackLogger(`${totalBalance} Authorization Letter: 100`);
            }

            // Customize Wallet [管理员调整钱包]
            const customizeWallet = await AdminLog.findAll({
                where: { 
                    type: 'update_wallet',
                    model: 'User',
                    'content.user_id': user.id
                },
                attributes: ['id', 'admin_id', 'url', 'content', 'createdAt']
            });
            for (const wallet of customizeWallet) {
                const content = wallet.content;
                if (content.walletType != 2) continue;
                if (content.addOrSubstract == 1) {
                    totalBalance += Number(content.amount);
                    moneyTrackLogger(`${totalBalance} Customize Wallet: +${content.amount}`);
                } else {
                    totalBalance -= Number(content.amount);
                    moneyTrackLogger(`${totalBalance} Customize Wallet: -${content.amount}`);
                }
            }

            moneyTrackLogger(`User ID: ${user.id}, Calculated Balance: ${totalBalance}, Actual Balance: ${user.balance}`);
            await user.update({ balance: totalBalance.toFixed(2) }, { where: { id: user.id } });
        } catch (error) {
            errLogger(`[UPDATE_BALANCE]: ${error.stack}`);
        }
    }

    MONEY_TRACK = async () => {
        try {
            moneyTrackLogger("*********************")
            const rewardGroup = await RewardRecord.findAll({
                where: {
                    reward_id: 7,
                    is_used: 0,
                    updatedAt: {
                        [Op.gt]: '2026-04-13 00:00:00'
                    },
                    description: '黄金券入库',
                },
                attributes: ['user_id'],
                group: ['user_id'],
            });

            const chunkSize = 100;
            for (let i = 0; i < rewardGroup.length; i += chunkSize) {
                const chunk = rewardGroup.slice(i, i + chunkSize);
                
                for (let group of chunk) {
                    const packages = await GoldPackageHistory.findAll({
                        where: {
                            user_id: group.user_id,
                            createdAt: {
                                [Op.gt]: '2026-04-10 00:00:00'
                            }
                        },
                    });
                    for (const pack of packages) {
                        moneyTrackLogger(`${JSON.stringify(pack)}`);
                        await pack.destroy();
                    }

                    const bonuses = await GoldPackageBonuses.findAll({
                        where: {
                            from_user_id: group.user_id,
                            createdAt: {
                                [Op.gt]: '2026-04-10 00:00:00'
                            }
                        },
                    });
                    for (const bonus of bonuses) {
                        const parentId = bonus.user_id;
                        moneyTrackLogger(`${JSON.stringify(bonus)}`);
                        await bonus.destroy();

                        const parentTransfer = await Transfer.findAll({
                            where: {
                                wallet_type: 2,
                                from: 2,
                                to: 1,
                                user_id: parentId,
                                createdAt: {
                                    [Op.gt]: '2026-04-10 00:00:00'
                                }
                            },
                        });
                        for (const tr of parentTransfer) {
                            moneyTrackLogger(`${JSON.stringify(tr)}`);
                            await tr.destroy();
                        }

                        const parentPackages = await GoldPackageHistory.findAll({
                            where: {
                                user_id: parentId,
                                createdAt: {
                                    [Op.gt]: '2026-04-10 00:00:00'
                                }
                            },
                        });
                        for (const pack of parentPackages) {
                            moneyTrackLogger(`${JSON.stringify(pack)}`);
                            await pack.destroy();
                        }

                        await this.UPDATE_BALANCE(parentId);
                    }

                    await Withdraw.update(
                        { status: 2, description: '黄金券入库' },
                        { where: { 
                            user_id: group.user_id, 
                            status: 0, 
                            createdAt: { [Op.gt]: '2026-04-10 00:00:00' } 
                        } 
                    });

                    const transfers = await Transfer.findAll({
                        where: {
                            wallet_type: 2,
                            from: 2,
                            to: 1,
                            user_id: group.user_id,
                            createdAt: {
                                [Op.gt]: '2026-04-10 00:00:00'
                            }
                        },
                    });
                    for (const tr of transfers) {
                        moneyTrackLogger(`${JSON.stringify(tr)}`);
                        await tr.destroy();
                    }

                    await this.UPDATE_BALANCE(group.user_id);
                }
            }

            moneyTrackLogger(`Finished processing ${rewardGroup.length} user(s) for MONEY_TRACK.`);

        } catch (error) {
            console.log(error) ;
            moneyTrackLogger(`[MONEY_TRACK]: ${error.stack}`);
        }
    }

    RESET_USER_BALANCE_FROM_WITHDRAWAL = async () => {
        try {
            const withdraws = await Withdraw.findAll({
                where: {
                    status: 0,
                    createdAt: {
                        [Op.between]: ['2026-04-15 00:00:00', '2026-04-15 23:59:59']
                    }
                },
                attributes: ['id', 'user_id', 'amount']
            });

            for (let index = 0; index < withdraws.length; index++) {
                const wd = withdraws[index];

                moneyTrackLogger(`[${wd.user_id}]: Started *******************`);
                
                const userWdPendingCount = await Withdraw.count({
                    where: {
                        user_id: wd.user_id,
                        status: 0,
                    }
                });
                if (userWdPendingCount > 1) continue;
                
                const latestSuccessWd = await Withdraw.findOne({
                    where: {
                        user_id: wd.user_id,
                        status: 1,
                        createdAt: {
                            [Op.lte]: '2026-04-09 23:59:59'
                        }
                    },
                    order: [['createdAt', 'DESC']],
                });
                const latestFailedWd = await Withdraw.findOne({
                    where: {
                        user_id: wd.user_id,
                        status: 2,
                        createdAt: {
                            [Op.lte]: '2026-04-09 23:59:59'
                        }
                    },
                    order: [['createdAt', 'DESC']],
                });
                let useFailOrSuccess = null;
                let latestBalance = 0;
                if (!latestSuccessWd && !latestFailedWd) continue;
                if (latestFailedWd && !latestSuccessWd) {
                    latestBalance = Number(latestFailedWd.before_amount);
                    useFailOrSuccess  = latestFailedWd;
                }
                if (latestSuccessWd && !latestFailedWd) {
                    latestBalance = Number(latestSuccessWd.after_amount);
                    useFailOrSuccess  = latestSuccessWd;
                }
                if (latestSuccessWd && latestFailedWd) {
                    if (moment(latestSuccessWd.createdAt).isAfter(moment(latestFailedWd.createdAt))) {
                        latestBalance = Number(latestSuccessWd.after_amount);
                        useFailOrSuccess  = latestSuccessWd;
                    } else {
                        latestBalance = Number(latestFailedWd.before_amount);
                        useFailOrSuccess  = latestFailedWd;
                    }
                }

                // reward 3
                const reward3Amount = await RewardRecord.sum('amount', {
                    where: { 
                        user_id: wd.user_id, 
                        reward_id: 3,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        } 
                    }
                }) || 0;
                latestBalance += Number(reward3Amount);

                // transfer 2 => 1
                const transfer21 = await Transfer.sum('amount', {
                    where: {
                        user_id: wd.user_id,
                        wallet_type: 2,
                        from: 2,
                        to: 1, // Reserve
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        }
                    }
                }) || 0;
                latestBalance -= Number(transfer21);

                // transfer 1 => 2
                const transfer12 = await Transfer.sum('amount', {
                    where: {
                        user_id: wd.user_id,
                        wallet_type: 1,
                        from: 1,
                        to: 2,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        }
                    }
                }) || 0;
                latestBalance += Number(transfer12);

                // 推荐金提取券
                const transfers = await Transfer.sum('amount', {
                    where: {
                        reward_id: 8,
                        user_id: wd.user_id,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        }
                    },
                }) || 0;
                latestBalance += Number(transfers);

                // Balance Transfer [余额转账]
                const balanceTransfer = await BalanceTransfer.findAll({
                    where: {
                        wallet_type: 2,
                        [Op.or]: [
                            { from_user: wd.user_id },
                            { to_user: wd.user_id }
                        ],
                    }
                }) || 0;
                for (const bt of balanceTransfer) {
                    if (bt.from_user == wd.user_id) {
                        latestBalance -= Number(bt.amount);
                    } else if (bt.to_user == wd.user_id) {
                        latestBalance += Number(bt.amount);
                    }
                }

                // Gold Package Return
                const goldPackageReturns = await GoldPackageReturn.sum('amount', {
                    where: { 
                        user_id: wd.user_id,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        } 
                    }
                }) || 0;
                latestBalance += Number(goldPackageReturns);

                // Buy Gold Package Bonus [购买黄金礼包奖励]
                const goldPackageBonuses = await GoldPackageBonuses.sum('amount', {
                    where: { 
                        user_id: wd.user_id,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        } 
                    }
                }) || 0;
                latestBalance += Number(goldPackageBonuses);

                // Authorization Letter [授权书]
                const letter = await RewardRecord.findOne({
                    where: {
                        user_id: wd.user_id,
                        reward_id: 6,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        }
                    },
                    attributes: ['id', 'is_used']
                });
                if (letter && letter.is_used) {
                    latestBalance += 100;
                }

                // Customize Wallet [管理员调整钱包]
                const customizeWallets = await AdminLog.findAll({
                    where: {
                        type: 'update_wallet',
                        model: 'User',
                        'content.user_id': wd.user_id,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        }
                    },
                    attributes: ['id', 'admin_id', 'url', 'content', 'createdAt']
                });
                for (const wallet of customizeWallets) {
                    const content = wallet.content;
                    if (content.walletType != 2) continue;
                    if (content.addOrSubstract == 1) {
                        latestBalance += Number(content.amount);
                    } else {
                        latestBalance -= Number(content.amount);
                    }
                }

                // Masonic Package Bonuses [共济礼包奖励]
                const masonicPackageBonuses = await MasonicPackageBonuses.sum('amount', {
                    where: { 
                        user_id: wd.user_id,
                        createdAt: {
                            [Op.gt]: useFailOrSuccess.createdAt,
                        } 
                    }
                }) || 0;
                latestBalance += Number(masonicPackageBonuses);

                // Cron Refund Withdrawal [定时任务退回提现]
                // const cronRefundWithdrawals = await Withdraw.sum('amount', {
                //     where: { 
                //         user_id: wd.user_id,
                //         status: 2,
                //         description: 'CRON REFUND',
                //         amount: {
                //             [Op.ne]: useFailOrSuccess.before_amount, // 排除掉本次提现之前已经退回的记录
                //         },
                //         createdAt: {
                //             [Op.gt]: useFailOrSuccess.createdAt,
                //         } 
                //     }
                // }) || 0;
                // latestBalance += Number(cronRefundWithdrawals);

                const remainingBalance = latestBalance - Number(wd.amount);
                const user = await User.findByPk(wd.user_id, { attributes: ['id', 'phone_number'] });
                moneyTrackLogger(`[${wd.user_id}]: Recalculated Balance: ${remainingBalance} | ${remainingBalance < 0 ? user.phone_number : ''}`);

                if (remainingBalance < 0) continue

                await User.update({ balance: latestBalance - wd.amount }, { where: { id: wd.user_id } });

            }
        } catch (error) {
            moneyTrackLogger(`[RESET_USER_BALANCE_FROM_WITHDRAWAL]: ${error.stack}`);
        }
    }

    CHECK_FEDERAL_PACKAGE_REIMBURSEMENT = async () => {
        try {
            const packages = await FederalReserveGoldPackageHistory.findAll({
                where: {
                    return_date: {
                        [Op.lte]: moment().toDate(),
                    },
                    is_returned_all: 0
                },
                attributes: ['id', 'user_id', 'package_id', 'price', 'reserve_earn', 'personal_gold']
            });

            for (const pack of packages) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const reserveEarn = Number(pack.reserve_earn);
                    const personalGold = Number(pack.personal_gold);
                    const originalPrice = Number(pack.price);
                    const masonicFund = Number(pack.masonic_fund);

                    const arr = []
                    if (reserveEarn > 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: reserveEarn,
                            type: 0, // 0-储备收益
                        })
                    }
                    if (personalGold > 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: personalGold,
                            type: 1, // 1-个人黄金
                        })
                    }
                    if (originalPrice > 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: originalPrice,
                            type: 2, // 2-本金返还
                        })
                    }
                    if (masonicFund > 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: masonicFund,
                            type: 3, // 3-共济基金返还
                        })
                    }
                    await FederalReserveGoldPackageEarn.bulkCreate(arr, { transaction: t });
                    const updateObj = { 
                        is_returned_all: 1,
                        description: 'CRON',
                    }
                    if (reserveEarn > 0) {
                        updateObj.is_returned_earn = 1;
                        updateObj.return_earn_date = new Date();
                    }
                    if (personalGold > 0) {
                        updateObj.is_returned_personal_gold = 1;
                        updateObj.return_personal_gold_date = new Date();
                    }
                    if (originalPrice > 0) {
                        updateObj.is_returned_price = 1;
                        updateObj.return_price_date = new Date();
                    }
                    if (masonicFund > 0) {
                        updateObj.is_returned_masonic_fund = 1;
                        updateObj.return_masonic_fund_date = new Date();
                    }

                    await pack.update(updateObj, { transaction: t });

                    await user.increment({ reserve_fund: reserveEarn + originalPrice }, { transaction: t });

                    await t.commit();
                } catch (error) {
                    errLogger(`[CHECK_FEDERAL_PACKAGE_REIMBURSEMENT][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }                  
            }
        } catch (error) {
            errLogger(`[CHECK_FEDERAL_PACKAGE_REIMBURSEMENT]: ${error.stack}`);
        }
    }

    RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE = async () => {
        try {
            const earns = await FederalReserveGoldPackageHistory.findAll({
                where: {
                    is_returned_earn: 0,
                },
                attributes: ['id', 'user_id', 'amount']
            });

            for (const earn of earns) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(earn.user_id, { attributes: ['id', 'balance', 'reserve_fund'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const amount = Number(earn.amount);
                    if (amount > 0) {
                        await user.increment({ balance: amount }, { transaction: t });
                        await earn.update({ is_returned_earn: 1, description: 'CRON', return_earn_date: new Date() }, { transaction: t });
                        await FederalReserveGoldPackageEarn.create({
                            user_id: earn.user_id,
                            relation: user.relation,
                            package_id: earn.package_id,
                            package_history_id: earn.package_history_id,
                            amount: amount,
                            type: 0,
                            description: `余额 ➕ ${amount} CRON RELEASE`,
                        }, { transaction: t });
                    }

                    await t.commit();
                } catch (error) {
                    errLogger(`[RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }
            }
        } catch (error) {
            errLogger(`[RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE]: ${error.stack}`);
        }
    }
}

module.exports = CronJob;