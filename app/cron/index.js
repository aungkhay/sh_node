const cron = require('node-cron');
const { AuthorizeLetterHistory, User, Rank, UserKYC, db, Allowance, Config, Transfer, Interest, GoldPrice, RewardType, RewardRecord, GoldInterest, TempMasonicFundHistory, MasonicFundHistory, MasonicFund, UserSpringFestivalCheckInLog, UserSpringFestivalCheckIn, SpringWhiteList, Deposit, GoldPackageHistory, UserRankPoint, Withdraw, GoldPackageReturn, GoldPackageBonuses, GoldCouponTemp, AdminLog, BalanceTransfer, MasonicPackageBonuses, FederalReserveGoldPackageHistory, FederalReserveGoldPackageEarn, PolicyPackageHistory, PolicyPackageEarn, CashFlow, PolicyPackage, UserLog, PaymentMethod, WithdrawMerchant, WithdrawMerchantChannel, ShanghaiCooperationHistory, ShanghaiCooperationEarn, Meeting, AttendedMeeting, GoldAppreciationPackageHistory, GoldAppreciationPackageEarn, GoldAppreciationPackageBonuses, ShanghaiCooperationBonuses, PolicyPackageBonuses, FederalReserveGoldPackage, ShanghaiCooperation, GoldAppreciationPackage, PersonalReservePackageHistory, PersonalReservePackageEarn, AssetEarnHistory, AssetDistributionPackageHistory, AssetDistributionPackageEarn, AssetEarnPackageHistory, AssetEarnPackageEarn } = require('../models');
const { Op, fn, col, literal, or } = require('sequelize');
const { commonLogger, errLogger, moneyTrackLogger } = require('../helpers/Logger');
const Decimal = require('decimal.js');
const axios = require('axios');
const RedisHelper = require('../helpers/RedisHelper');
const moment = require('moment');
const MasonicPackageHistory = require('../models/MasonicPackageHistory');
const MasonicPackageEarn = require('../models/MasonicPackageEarn');
const MerchantController = require('../controllers/users/MerchantController');

class CronJob {
    constructor(app) {
        this.redisHelper = new RedisHelper(app);
        this.interval = null;
        this.getRandomInt = (min, max) => {
            return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
        }
        this.merchantController = new MerchantController();

        this.is_asset_treasure_active = async () => {
            try {
                let isActive = await this.redisHelper.getValue('is_asset_treasure_active');
                if (!isActive) {
                    const config = await Config.findOne({
                        where: { type: 'is_asset_treasure_active' },
                        attributes: ['val']
                    });
                    if (config) {
                        await this.redisHelper.setValue('is_asset_treasure_active', config.val);
                    }
                    isActive = config ? config.val : 0;
                }
                return Number(isActive) === 1;
            } catch (error) {
                errLogger('Error checking if asset treasure is active:' + error.stack);
                return false;
            }
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
        // cron.schedule('0 */6 * * *', this.RESET_ACTIVE).start();
        // Runs every day at midnight
        cron.schedule('0 0 * * *', this.RESET_REWARD_COUNT).start();
        cron.schedule('0 0 * * *', this.EARN_INTEREST).start();
        cron.schedule('0 0 * * *', this.RESET_TODAY_NEWS_REWARD_COUNT).start();
        cron.schedule('0 0 * * *', this.RESET_CAN_GET_RED_ENVELOPE).start();
        // Run at 23:30 every day
        cron.schedule('30 23 * * *', this.RESET_REWARD_TYPE).start();
        // cron.schedule('30 23 * * *', this.CHECK_GOLD_PACKAGE_DAILY_RETURN).start();
        cron.schedule('20 0 * * *', this.GIVE_MASONIC_BONUS).start();
        cron.schedule('30 0 * * *', this.GIVE_POLICY_PACKAGE_EARN).start();
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
        cron.schedule('40 0 * * *', this.CHECK_SHANGHAI_COOPERATION_REIMBURSEMENT).start();
        // cron.schedule('* * * * *', this.SEND_WITHDRAWAL_TO_THIRD_PARTY).start();
        cron.schedule('*/3 * * * *', this.UPDATE_MEETING_USED_CODE).start();
        // Run every 10 second
        cron.schedule('*/10 * * * * *', this.RELEASE_MEETING_REWARD).start();
        // Run every 1 minute
        cron.schedule('* * * * *', this.RELEASE_USER_ACTIVE_STATUS).start();
        // run every 00:50
        cron.schedule('50 0 * * *', this.CHECK_PERSONAL_RESERVE_PACKAGE_REIMBURSEMENT).start();
        // Run every hour
        cron.schedule('0 2-23 * * *', this.CHECK_VALIDED_COUPON).start();
        // Run at 1AM Every day
        cron.schedule('0 1 15 * *', this.CHECK_GOLD_APPRECIATION_PACKAGE_RETURN_EARN).start();
        cron.schedule('0 1 * * *', this.CHECK_GOLD_APPRECIATION_PACKAGE_REIMBURSEMENT).start();
        cron.schedule('30 1 * * *', this.CALCULATE_ASSET_EARN).start();
        cron.schedule('0 2 * * *', this.RELEASE_ASSET_FUND).start();
        cron.schedule('30 2 * * *', this.RELEASE_ASSET_EARN).start();
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
            
            await this.redisHelper.setValue('latest_gold_price', pricePerGram);

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
            await this.redisHelper.deleteKey('CANNOT_GET_RED_ENVELOP_USERS');
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
                            await CashFlow.create({
                                user_id: user.id,
                                relation: user.relation,
                                wallet_type: 2,
                                model: 'RewardRecord',
                                type: '红包雨奖励',
                                amount: amount,
                                before_amount: user.balance,
                                after_amount: Number(user.balance) + Number(amount),
                                flow_status: 'IN'
                            }, { transaction: t });
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
                    await CashFlow.create({
                        user_id: user.id,
                        relation: user.relation,
                        wallet_type: 2,
                        model: 'RewardRecord',
                        type: '红包雨奖励',
                        amount: balance_fund,
                        before_amount: user.balance,
                        after_amount: Number(user.balance) + Number(balance_fund),
                        flow_status: 'IN'
                    }, { transaction: t });
                    await user.increment({ balance: balance_fund, masonic_fund: -balance_fund }, { transaction: t });
                }
                if (reward.total_reward >= reward.limit) {
                    await user.update({ can_get_red_envelop: 0 }, { transaction: t });
                    await this.redisHelper.sAddValue('CANNOT_GET_RED_ENVELOP_USERS', userId);
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
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation', 'balance'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const reimbursementAmount = new Decimal(Number(pack.price))
                        .times(Number(pack.reimbursement_rate))
                        .times(0.01)
                        .toNumber();
                    if (reimbursementAmount > 0) {
                        await CashFlow.create({
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 2,
                            model: 'GoldPackageReturn',
                            type: '和衷联储礼包报销返还',
                            amount: reimbursementAmount,
                            before_amount: user.balance,
                            after_amount: Number(user.balance) + Number(reimbursementAmount),
                            flow_status: 'IN',
                            description: `${pack.package_id == 1 ? '和衷联储黄金初级礼包' : pack.package_id == 2 ? '和衷联储黄金中级礼包' : ''}`
                        }, { transaction: t });

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
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation', 'balance'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const dailyReward = new Decimal(Number(pack.price))
                        .times(0.01) // 1% daily reward
                        .toNumber();
                    if (dailyReward > 0) {
                        
                        await GoldPackageReturn.create({
                            user_id: user.id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: dailyReward,
                            description: '礼包每日储备收益',
                        }, { transaction: t });
                        await CashFlow.create({
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 2,
                            model: 'GoldPackageReturn',
                            type: '和衷联储礼包每日储备收益',
                            amount: dailyReward,
                            before_amount: user.balance,
                            after_amount: Number(user.balance) + Number(dailyReward),
                            flow_status: 'IN',
                            description: `${pack.package_id == 3 ? '和衷联储黄金初级礼包（第二批）' : pack.package_id == 4 ? '和衷联储黄金中级礼包（第二批）' : pack.package_id == 5 ? '和衷联储黄金高级礼包（第二批）' : ''}`
                        }, { transaction: t });
                        await user.increment({ balance: dailyReward }, { transaction: t });
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
                    const user = await User.findByPk(withdraw.user_id, { attributes: ['id', 'relation', 'balance'], transaction: t });
                    if (!user) continue;
                    
                    await CashFlow.create({
                        user_id: user.id,
                        relation: user.relation,
                        wallet_type: 2,
                        model: 'Withdraw',
                        type: '提现',
                        amount: withdraw.amount,
                        before_amount: user.balance,
                        after_amount: Number(user.balance) + Number(withdraw.amount),
                        flow_status: 'IN',
                        description: '退款提现金额'
                    }, { transaction: t });
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
                    const user = await User.findByPk(withdraw.user_id, { attributes: ['id', 'relation', 'balance'], transaction: t });
                    if (!user) continue;
                    
                    await CashFlow.create({
                        user_id: user.id,
                        relation: user.relation,
                        wallet_type: 2,
                        model: 'Withdraw',
                        type: '提现',
                        amount: withdraw.amount,
                        before_amount: user.balance,
                        after_amount: Number(user.balance) + Number(withdraw.amount),
                        flow_status: 'IN',
                        description: '退款提现金额'
                    }, { transaction: t });
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

            const isAssetActive = await this.is_asset_treasure_active();

            for (let pack of packages) {
                // daily_earn is can be get on the next day after the package is bought, so only give bonus when createdAt is before today
                // if (moment(pack.createdAt).isAfter(moment().startOf('day'))) {
                //     continue;
                // }

                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'balance', 'relation', 'total_assets'], transaction: t });
                    if (!user) {
                        await t.rollback();
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

                    const dailyEarn = Number(pack.daily_earn);
                    const walletType = isAssetActive ? 3 : 2; // 3 for asset treasure, 2 for balance
                    const walletColumn = isAssetActive ? 'total_assets' : 'balance';
                    await MasonicPackageEarn.create({
                        user_id: user.id,
                        relation: user.relation,
                        package_id: pack.package_id,
                        package_history_id: pack.id,
                        amount: dailyEarn,
                        description: '共计资金礼包每日收益',
                    }, { transaction: t });
                    await CashFlow.create({
                        user_id: user.id,
                        relation: user.relation,
                        wallet_type: walletType,
                        model: 'MasonicPackageEarn',
                        type: '上合终身授权计划收益',
                        amount: dailyEarn,
                        before_amount: user[walletColumn],
                        after_amount: Number(user[walletColumn]) + Number(dailyEarn),
                        flow_status: 'IN'
                    }, { transaction: t });

                    let incrementFields = { [walletColumn]: dailyEarn };
                    if (isAssetActive) {
                        incrementFields.daily_product_earn = dailyEarn;
                    }
                    await user.increment(incrementFields, { transaction: t });

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
                attributes: ['id', 'user_id', 'package_id', 'price', 'reserve_earn', 'personal_gold', 'masonic_fund', 'is_returned_earn', 'is_returned_personal_gold', 'is_returned_price', 'is_returned_masonic_fund']
            });

            const isAssetActive = await this.is_asset_treasure_active();
            const walletType = isAssetActive ? 3 : 2; // 3-资产宝, 2-余额
            const walletColumn = isAssetActive ? 'total_assets' : 'balance';

            for (const pack of packages) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation', 'balance', 'total_assets'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const reserveEarn = Number(pack.reserve_earn);
                    const personalGold = Number(pack.personal_gold);
                    const originalPrice = Number(pack.price);
                    const masonicFund = Number(pack.masonic_fund);

                    const arr = []
                    if (reserveEarn > 0 && Number(pack.is_returned_earn) === 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: reserveEarn,
                            type: 0, // 0-储备收益
                        })
                    }
                    if (personalGold > 0 && Number(pack.is_returned_personal_gold) === 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: personalGold,
                            type: 1, // 1-个人黄金
                        })
                    }
                    if (originalPrice > 0 && Number(pack.is_returned_price) === 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: originalPrice,
                            type: 2, // 2-本金返还
                        })
                    }
                    if (masonicFund > 0 && Number(pack.is_returned_masonic_fund) === 0) {
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
                    if (reserveEarn > 0 && Number(pack.is_returned_earn) === 0) {
                        updateObj.is_returned_earn = 1;
                        updateObj.return_earn_date = new Date();
                    }
                    if (personalGold > 0 && Number(pack.is_returned_personal_gold) === 0) {
                        updateObj.is_returned_personal_gold = 1;
                        updateObj.return_personal_gold_date = new Date();
                    }
                    if (originalPrice > 0 && Number(pack.is_returned_price) === 0) {
                        updateObj.is_returned_price = 1;
                        updateObj.return_price_date = new Date();
                    }
                    if (masonicFund > 0 && Number(pack.is_returned_masonic_fund) === 0) {
                        updateObj.is_returned_masonic_fund = 1;
                        updateObj.return_masonic_fund_date = new Date();
                    }

                    await pack.update(updateObj, { transaction: t });

                    let desc = '';
                    if (reserveEarn > 0) {
                        desc += `储备收益返还${reserveEarn}`;
                    }
                    if (originalPrice > 0) {
                        desc += `, 本金返还${originalPrice}`;
                    }
                    if (reserveEarn > 0 || originalPrice > 0) {
                        await CashFlow.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'FederalReserveGoldPackageEarn',
                            type: '联储备黄金礼包返还',
                            amount: reserveEarn + originalPrice,
                            before_amount: user[walletColumn],
                            after_amount: Number(user[walletColumn]) + reserveEarn + originalPrice,
                            flow_status: 'IN',
                            description: desc,
                        }, { transaction: t });

                        let incrementFields = { [walletColumn]: reserveEarn + originalPrice };
                        if (isAssetActive) {
                            incrementFields.daily_product_earn = reserveEarn + originalPrice;
                        }
                        if (masonicFund > 0) {
                            incrementFields.masonic_fund = masonicFund;
                        }

                        await user.increment(incrementFields, { transaction: t });
                    }

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

    CHECK_GOLD_APPRECIATION_PACKAGE_RETURN_EARN = async () => {
        try {
            const packages = await GoldAppreciationPackageHistory.findAll({
                where: {
                    gold_appreciation_earn_count_remain: {
                        [Op.gt]: 0,
                    },
                },
                attributes: ['id', 'user_id', 'package_id', 'price', 'period', 'reserve_earn', 'gold_appreciation_earn', 'is_returned_earn', 'is_returned_price', 'gold_appreciation_earn_count_remain']
            });

            const goldPrice = await GoldPrice.findOne({
                order: [['createdAt', 'DESC']],
            });

            const isAssetActive = await this.is_asset_treasure_active();
            const walletType = isAssetActive ? 3 : 2; // 3-资产宝, 2-余额
            const walletColumn = isAssetActive ? 'total_assets' : 'balance';

            for (const pack of packages) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation', 'balance', 'total_gold_count_in_letter', 'total_assets'], transaction: t });
                    if (!user) {
                        continue;
                    }

                    let addBalance = 0;
                    let updateObj = {};

                    // 2 - 本金返还
                    if (pack.is_returned_price == 0 && pack.price > 0) {
                        await GoldAppreciationPackageEarn.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: Number(pack.price),
                            type: 2, // 2-本金返还
                        }, { transaction: t });

                        updateObj = {
                            is_returned_price: 1,
                            return_price_date: new Date(),
                        }

                        await CashFlow.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'GoldAppreciationPackageEarn',
                            type: '黄金增值计划本金返还',
                            amount: Number(pack.price),
                            before_amount: user[walletColumn],
                            after_amount: Number(user[walletColumn]) + Number(pack.price),
                            flow_status: 'IN',
                            description: `黄金增值计划本金返还${pack.price}`,
                        }, { transaction: t });

                        addBalance += Number(pack.price);
                    }

                    // 0 - 黄金增值金
                    const goldGram = Number(pack.gold_appreciation_earn) / Number(goldPrice.reserve_price);
                    // const letterHistory = await AuthorizeLetterHistory.findOne({
                    //     where: {
                    //         user_id: pack.user_id,
                    //         letter_id: 5, // 黄金增值金授权书
                    //         gold_count: {
                    //             [Op.gte]: goldGram,
                    //         },
                    //     },
                    // });
                    let substractGoldGram = 0;
                    if (goldGram > 0) {
                        substractGoldGram = goldGram;
                        // await letterHistory.increment({ gold_count: -goldGram }, { transaction: t });
                        await GoldAppreciationPackageEarn.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: pack.gold_appreciation_earn,
                            type: 0, // 0-黄金增值金
                            description: `转换${goldGram.toFixed(4)}克黄金`,
                        }, { transaction: t });

                        await CashFlow.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'GoldAppreciationPackageEarn',
                            type: '黄金增值金返还',
                            amount: pack.gold_appreciation_earn,
                            before_amount: user[walletColumn] + addBalance,
                            after_amount: Number(user[walletColumn]) + Number(pack.gold_appreciation_earn) + addBalance,
                            flow_status: 'IN',
                        }, { transaction: t });

                        updateObj.gold_appreciation_earn_count_remain = pack.gold_appreciation_earn_count_remain - 1;
                        addBalance += Number(pack.gold_appreciation_earn);
                    }
                    
                    if (addBalance > 0) {
                        let incrementFields = {};
                        incrementFields[walletColumn] = addBalance;
                        if (substractGoldGram > 0) {
                            incrementFields.total_gold_count_in_letter = -substractGoldGram;
                            incrementFields.total_gold_count = substractGoldGram;
                        }
                        if (isAssetActive) {
                            incrementFields.daily_product_earn = addBalance;
                        }
                        await user.increment(incrementFields, { transaction: t });
                        await pack.update(updateObj, { transaction: t });
                    }

                    await t.commit();

                    console.log(`[CHECK_GOLD_APPRECIATION_PACKAGE_RETURN_EARN] User ID: ${pack.user_id}, Package ID: ${pack.package_id}, Added Balance: ${addBalance}`);
                } catch (error) {
                    errLogger(`[CHECK_GOLD_APPRECIATION_PACKAGE_RETURN_EARN][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }                  
            }
        } catch (error) {
            errLogger(`[CHECK_GOLD_APPRECIATION_PACKAGE_RETURN_EARN]: ${error.stack}`);
        }
    }

    CHECK_GOLD_APPRECIATION_PACKAGE_REIMBURSEMENT = async () => {
        try {
            const today = moment().format('YYYY-MM-DD');
            const packages = await GoldAppreciationPackageHistory.findAll({
                where: {
                    return_date: {
                        [Op.lt]: today,
                    },
                    is_returned_earn: 0,
                    reserve_earn: {
                        [Op.gt]: 0,
                    }
                },
                attributes: ['id', 'user_id', 'package_id', 'price', 'reserve_earn']
            });

            const isAssetActive = await this.is_asset_treasure_active();
            const walletType = isAssetActive ? 3 : 2; // 3-资产宝, 2-余额
            const walletColumn = isAssetActive ? 'total_assets' : 'balance';

            for (const pack of packages) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation', 'balance', 'total_assets'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const reserveEarn = Number(pack.reserve_earn);

                    if (reserveEarn > 0) {
                        await GoldAppreciationPackageEarn.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: reserveEarn,
                            type: 1, // 1-战略储备金
                        }, { transaction: t });

                        await pack.update({
                            is_returned_earn: 1,
                            return_earn_date: new Date(),
                        }, { transaction: t });

                        await CashFlow.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'GoldAppreciationPackageEarn',
                            type: '黄金增值计划战略储备金返还',
                            amount: reserveEarn,
                            before_amount: user[walletColumn],
                            after_amount: Number(user[walletColumn]) + reserveEarn,
                            flow_status: 'IN',
                            description: `黄金增值计划战略储备金返还${reserveEarn}`,
                        }, { transaction: t });

                        let incremntFields = { [walletColumn]: reserveEarn };
                        if (isAssetActive) {
                            incremntFields.daily_product_earn = reserveEarn;
                        }
                        await user.increment(incremntFields, { transaction: t });
                    }
                    await t.commit();

                    console.log(`[CHECK_GOLD_APPRECIATION_PACKAGE_REIMBURSEMENT] User ID: ${pack.user_id}, Package ID: ${pack.package_id}, Added Balance: ${reserveEarn}`);

                } catch (error) {
                    errLogger(`[CHECK_GOLD_APPRECIATION_PACKAGE_REIMBURSEMENT][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }                  
            }

        } catch (error) {
            errLogger(`[CHECK_GOLD_APPRECIATION_PACKAGE_REIMBURSEMENT]: ${error.stack}`);
        }
    }

    CHECK_SHANGHAI_COOPERATION_REIMBURSEMENT = async () => {
        try {
            const packages = await ShanghaiCooperationHistory.findAll({
                where: {
                    end_date: {
                        [Op.lte]: moment().toDate(),
                    },
                    is_returned_all: 0
                },
                attributes: ['id', 'user_id', 'package_id', 'price', 'masonic_fund', 'exchange_value', 'is_returned_price', 'is_returned_masonic_fund', 'is_returned_exchange_value']
            });

            const isAssetActive = await this.is_asset_treasure_active();
            const walletType = isAssetActive ? 3 : 2; // 3-资产宝, 2-余额
            const walletColumn = isAssetActive ? 'total_assets' : 'balance';

            for (const pack of packages) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation', 'balance', 'total_assets'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const originalPrice = Number(pack.price);
                    const masonicFund = Number(pack.masonic_fund);
                    const exchangeValue = Number(pack.exchange_value);

                    const arr = []
                    if (masonicFund > 0 && Number(pack.is_returned_masonic_fund) === 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: masonicFund,
                            type: 0, // 0-共济基金返还
                        })
                    }
                    if (exchangeValue > 0 && Number(pack.is_returned_exchange_value) === 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: exchangeValue,
                            type: 1, // 1-兑换价值返还
                        })
                    }
                    if (originalPrice > 0 && Number(pack.is_returned_price) === 0) {
                        arr.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: originalPrice,
                            type: 2, // 2-本金返还
                        })
                    }

                    await ShanghaiCooperationEarn.bulkCreate(arr, { transaction: t });
                    const updateObj = { 
                        is_returned_all: 1,
                        description: 'CRON',
                    }
                    
                    if (masonicFund > 0 && Number(pack.is_returned_masonic_fund) === 0) {
                        updateObj.is_returned_masonic_fund = 1;
                        updateObj.return_masonic_fund_date = new Date();
                    }
                    if (exchangeValue > 0 && Number(pack.is_returned_exchange_value) === 0) {
                        updateObj.is_returned_exchange_value = 1;
                        updateObj.return_exchange_value_date = new Date();
                    }
                    if (Number(pack.is_returned_price) === 0) {
                        updateObj.is_returned_price = 1;
                        updateObj.return_price_date = new Date();
                    }

                    await pack.update(updateObj, { transaction: t });

                    let desc = '';
                    if (exchangeValue > 0) {
                        desc += `兑换价值返还${exchangeValue}`;
                    }
                    if (originalPrice > 0) {
                        desc += `, 本金返还${originalPrice}`;
                    }
                    if (exchangeValue > 0 || originalPrice > 0) {
                        await CashFlow.create({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'ShanghaiCooperationEarn',
                            type: '上海合作组织收益返还',
                            amount: exchangeValue + originalPrice,
                            before_amount: user[walletColumn],
                            after_amount: Number(user[walletColumn]) + exchangeValue + originalPrice,
                            flow_status: 'IN',
                            description: desc,
                        }, { transaction: t });

                        let incrementFields = { [walletColumn]: exchangeValue + originalPrice };
                        if (isAssetActive) {
                            incrementFields.daily_product_earn = exchangeValue + originalPrice;
                        }
                        if (masonicFund > 0) {
                            incrementFields.masonic_fund = masonicFund;
                        }

                        await user.increment(incrementFields, { transaction: t });
                    }

                    await t.commit();

                    console.log(`[CHECK_SHANGHAI_COOPERATION_REIMBURSEMENT] User ID: ${pack.user_id}, Package ID: ${pack.package_id}, Added Balance: ${exchangeValue + originalPrice}`);
                } catch (error) {
                    errLogger(`[CHECK_SHANGHAI_COOPERATION_REIMBURSEMENT][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }                  
            }
        } catch (error) {
            errLogger(`[CHECK_SHANGHAI_COOPERATION_REIMBURSEMENT]: ${error.stack}`);
        }
    }

    CHECK_PERSONAL_RESERVE_PACKAGE_REIMBURSEMENT = async () => {
        try {
            const goldPrice = await GoldPrice.findOne({
                order: [['createdAt', 'DESC']],
            });
            if (!goldPrice) {
                return;
            }

            const packages = await PersonalReservePackageHistory.findAll({
                where: {
                    return_start_date: {
                        [Op.lte]: moment().format('YYYY-MM-DD'),
                    },
                    is_returned_earn: 0,
                    is_returned_price: 0,
                    is_returned_personal_gold: 0
                },
                order: [['createdAt', 'ASC']],
            });

            const isAssetActive = await this.is_asset_treasure_active();
            const walletType = isAssetActive ? 3 : 2;
            const walletColumn = isAssetActive ? 'total_assets' : 'balance';
            
            let totalReleasedGoldCount = 0;
            let totalReleasedGoldAmount = 0;
            for (const pack of packages) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'relation', 'balance', 'total_gold_count', 'total_gold_count_in_coupon', 'total_gold_count_in_letter', 'total_assets'], transaction: t });
                    if (!user) {
                        continue;
                    }

                    const ownGoldGram = Number(user.total_gold_count_in_coupon) + Number(user.total_gold_count_in_letter);
                    const goldGram = new Decimal(ownGoldGram * Number(pack.release_personal_gold_rate)).times(0.01).toNumber();
                    const reserveEarn = Number(pack.reserve_earn);
                    const originPrice = Number(pack.price);
                    const goldInAmount = goldGram * goldPrice.reserve_price;
                    totalReleasedGoldAmount += goldInAmount;
                    totalReleasedGoldCount += goldGram;

                    const earns = [];
                    const cashflows = [];
                    const updateObj = {};
                    const now = new Date();
                    let beforeAmount = Number(user[walletColumn]);
                    let afterAmount = Number(user[walletColumn]);
                    
                    if (reserveEarn > 0) {
                        afterAmount += reserveEarn;
                        earns.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: reserveEarn,
                            type: 0, // 0-储备现金
                        });
                        cashflows.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'PersonalReservePackageEarn',
                            type: '上合个人储备计划收益返还',
                            amount: reserveEarn,
                            before_amount: beforeAmount,
                            after_amount: afterAmount,
                            flow_status: 'IN',
                            description: `储备现金返还`,
                        });
                        updateObj.is_returned_earn = 1;
                        updateObj.return_earn_date = now;
                    }
                    if (originPrice > 0) {
                        beforeAmount = afterAmount;
                        afterAmount += originPrice;
                        earns.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: originPrice,
                            type: 2, // 2-储备费(本金)
                        });
                        cashflows.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'PersonalReservePackageEarn',
                            type: '上合个人储备计划收益返还',
                            amount: originPrice,
                            before_amount: beforeAmount,
                            after_amount: afterAmount,
                            flow_status: 'IN',
                            description: `储备费返还`,
                        });
                        updateObj.is_returned_price = 1;
                        updateObj.return_price_date = now;
                    }
                    if (goldInAmount > 0) {
                        beforeAmount = afterAmount;
                        afterAmount += goldInAmount;
                        earns.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            package_id: pack.package_id,
                            package_history_id: pack.id,
                            amount: goldInAmount,
                            type: 1, // 1-个人黄金(ex-rate)
                        });
                        cashflows.push({
                            user_id: pack.user_id,
                            relation: user.relation,
                            wallet_type: walletType,
                            model: 'PersonalReservePackageEarn',
                            type: '上合个人储备计划收益返还',
                            amount: goldInAmount,
                            before_amount: beforeAmount,
                            after_amount: afterAmount,
                            flow_status: 'IN',
                            description: `个人黄金返还`,
                        });
                        updateObj.is_returned_personal_gold = 1;
                        updateObj.return_personal_gold_date = now;
                        updateObj.return_personal_gold_in_amount = goldInAmount;
                    }

                    await CashFlow.bulkCreate(cashflows, { transaction: t });
                    await PersonalReservePackageEarn.bulkCreate(earns, { transaction: t });

                    // 合并扣除黄金克数
                    let subCouponCount = 0;
                    if (Number(user.total_gold_count_in_coupon) >= goldGram) {
                        subCouponCount = goldGram;
                    } else {
                        subCouponCount = Number(user.total_gold_count_in_coupon);
                    }
                    let subLetterCount = goldGram - subCouponCount;
                    let usedGoldCount = Number(user.total_gold_count) + goldGram;

                    let incrementFields = {
                        [walletColumn]: reserveEarn + originPrice + goldInAmount, 
                        total_gold_count_in_coupon: -subCouponCount, 
                        total_gold_count_in_letter: -subLetterCount,
                        total_gold_count: usedGoldCount
                    }
                    if (isAssetActive) {
                        incrementFields.daily_product_earn = reserveEarn + originPrice + goldInAmount;
                    }

                    await user.increment(incrementFields, { transaction: t });
                    await pack.update(updateObj, { transaction: t });

                    await t.commit();

                    commonLogger(`[CHECK_PERSONAL_RESERVE_PACKAGE_REIMBURSEMENT][UID: ${pack.user_id}][HID: ${pack.id}]: Released ${reserveEarn + originPrice + goldInAmount} from personal reserve package to balance.`);
                } catch (error) {
                    errLogger(`[CHECK_PERSONAL_RESERVE_PACKAGE_REIMBURSEMENT][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }
            }

            commonLogger(`[CHECK_PERSONAL_RESERVE_PACKAGE_REIMBURSEMENT]: Total released gold count: ${totalReleasedGoldCount}, Total released gold amount: ${totalReleasedGoldAmount}`);
        } catch (error) {
            errLogger(`[CHECK_PERSONAL_RESERVE_PACKAGE_REIMBURSEMENT]: ${error.stack}`); 
        }
    }

    // Not Cron
    RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE = async () => {
        try {
            const history = await FederalReserveGoldPackageHistory.findAll({
                where: {
                    is_returned_earn: 0,
                    createdAt: {
                        [Op.lt]: '2026-04-28 00:00:00'
                    }
                },
                attributes: ['id', 'user_id', 'reserve_earn', 'package_id']
            });

            for (const his of history) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(his.user_id, { attributes: ['id', 'relation'], transaction: t });
                    if (!user) {
                        continue;
                    }
                    const amount = Number(his.reserve_earn);
                    if (amount > 0) {
                        await user.increment({ balance: amount }, { transaction: t });
                        await his.update({ is_returned_earn: 1, description: 'CRON', return_earn_date: new Date() }, { transaction: t });
                        await FederalReserveGoldPackageEarn.create({
                            user_id: his.user_id,
                            relation: user.relation,
                            package_id: his.package_id,
                            package_history_id: his.id,
                            amount: amount,
                            type: 0,
                            description: `余额 ➕ ${amount} CRON RELEASE`,
                        }, { transaction: t });
                    }

                    await t.commit();
                    console.log(`[RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE][User ID: ${his.user_id}]: Released ${amount} from reserve fund to balance.`);
                } catch (error) {
                    errLogger(`[RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }
            }

            console.log(`[RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE]: Completed processing ${history.length} record(s).`);
        } catch (error) {
            errLogger(`[RELEASE_FEDERAL_RESERVE_FUND_TO_BALANCE]: ${error.stack}`);
        }
    }

    GIVE_POLICY_PACKAGE_EARN = async () => {
        try {
            const today = moment().format('YYYY-MM-DD');
            const packages = await PolicyPackageHistory.findAll({
                include: {
                    model: PolicyPackage,
                    as: 'package',
                    attributes: ['id', 'masonic_fund']
                },
                attributes: ['id', 'user_id', 'package_id', 'price', 'daily_earn', 'end_date', 'createdAt'],
                where: {
                    is_finished: 0,
                    createdAt: {
                        [Op.lt]: `${today} 00:00:00`,
                    }
                }
            });

            const isAssetActive = await this.is_asset_treasure_active();
            const walletType = isAssetActive ? 3 : 2; // 3-资产宝, 2-余额
            const walletColumn = isAssetActive ? 'total_assets' : 'balance';

            for (const pack of packages) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(pack.user_id, { attributes: ['id', 'balance', 'relation', 'total_assets'], transaction: t });
                    if (!user) {
                        await t.rollback();
                        continue;
                    }
                    
                    const dailyEarn = Number(pack.daily_earn);
                    if (dailyEarn > 0) {

                        // 日返最后一天同时返还本金
                        if (moment(pack.end_date).format('YYYY-MM-DD') === today) {

                            await CashFlow.create({
                                user_id: user.id,
                                relation: user.relation,
                                wallet_type: walletType,
                                model: 'PolicyPackageEarn',
                                type: '上合贡献政策收益',
                                amount: dailyEarn + Number(pack.price),
                                before_amount: user[walletColumn],
                                after_amount: Number(user[walletColumn]) + dailyEarn + Number(pack.price),
                                flow_status: 'IN'
                            }, { transaction: t });

                            let incrementFields = { [walletColumn]: dailyEarn + Number(pack.price) };
                            if (isAssetActive) {
                                incrementFields.daily_product_earn = dailyEarn;
                            }
                            await user.increment(incrementFields, { transaction: t });

                            await PolicyPackageEarn.create({
                                user_id: pack.user_id,
                                relation: user.relation,
                                package_id: pack.package_id,
                                package_history_id: pack.id,
                                amount: dailyEarn,
                                description: '上合贡献政策收益'
                            }, { transaction: t });
                            await PolicyPackageEarn.create({
                                user_id: pack.user_id,
                                relation: user.relation,
                                package_id: pack.package_id,
                                package_history_id: pack.id,
                                amount: Number(pack.price),
                                description: '上合贡献政策收益'
                            }, { transaction: t });
                            
                            await pack.update({ is_finished: 1 }, { transaction: t });
                            
                            if (Number(pack.package.masonic_fund) > 0) {
                                const exist = await MasonicFundHistory.findOne({
                                    where: {
                                        user_id: user.id,
                                        description: `PKG-${pack.id}`,
                                    },
                                    transaction: t
                                });
                                if (!exist) {
                                    await MasonicFundHistory.create({
                                        relation: user.relation,
                                        user_id: user.id,
                                        amount: Number(pack.package.masonic_fund),
                                        description: `PKG-${pack.id} 上合贡献政策 - 定时任务发共济基金`,
                                        status: 'APPROVED'
                                    }, { transaction: t });

                                    await user.increment({ masonic_fund: Number(pack.package.masonic_fund) }, { transaction: t });
                                }
                            }
                        } else {
                            await CashFlow.create({
                                user_id: user.id,
                                relation: user.relation,
                                wallet_type: walletType,
                                model: 'PolicyPackageEarn',
                                type: '上合贡献政策收益',
                                amount: dailyEarn,
                                before_amount: user[walletColumn],
                                after_amount: Number(user[walletColumn]) + dailyEarn,
                                flow_status: 'IN'
                            }, { transaction: t });

                            let incrementFields = { [walletColumn]: dailyEarn };
                            if (isAssetActive) {
                                incrementFields.daily_product_earn = dailyEarn;
                            }
                            await user.increment(incrementFields, { transaction: t });
                            await PolicyPackageEarn.create({
                                user_id: pack.user_id,
                                relation: user.relation,
                                amount: dailyEarn,
                                package_id: pack.package_id,
                                package_history_id: pack.id,
                                description: '上合贡献政策收益'
                            }, { transaction: t });
                        }
                    }

                    await t.commit();
                    console.log(`[GIVE_POLICY_PACKAGE_EARN][User ID: ${pack.user_id}]: Released ${dailyEarn} from policy package to balance.`);
                } catch (error) {
                    errLogger(`[GIVE_POLICY_PACKAGE_EARN][Transaction Error]: ${error.stack}`);
                    await t.rollback();
                }
            }
        } catch (error) {
            errLogger(`[GIVE_POLICY_PACKAGE_EARN]: ${error.stack}`);
        }
    }

    // NOT CRON
    SET_INITIAL_BUY_PRODUCT_DATE = async () => {
        try {
            const [activeFederal, activeGold, activeMasonic, activePolicy, activeGoldAppr] = await Promise.all([
                FederalReserveGoldPackageHistory.findAll({
                    where: { price: { [Op.gt]: 0 } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
                GoldPackageHistory.findAll({
                    where: { price: { [Op.gt]: 0 } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
                MasonicPackageHistory.findAll({
                    where: { price: { [Op.gt]: 0 } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
                PolicyPackageHistory.findAll({
                    where: { price: { [Op.gt]: 0 } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
                GoldAppreciationPackageHistory.findAll({
                    where: { price: { [Op.gt]: 0 } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
            ]);

            const activeUserSet = new Set();
            activeFederal.forEach(r => r.user_id != null && activeUserSet.add(r.user_id));
            activeGold.forEach(r => r.user_id != null && activeUserSet.add(r.user_id));
            activeMasonic.forEach(r => r.user_id != null && activeUserSet.add(r.user_id));
            activePolicy.forEach(r => r.user_id != null && activeUserSet.add(r.user_id));
            activeGoldAppr.forEach(r => r.user_id != null && activeUserSet.add(r.user_id));
            const activeUserIds = Array.from(activeUserSet);
            console.log(`Found ${activeUserIds.length} active users who have purchased products.`);

            for (const userId of activeUserIds) {
                const federalRecord = await FederalReserveGoldPackageHistory.findOne({
                    where: { user_id: userId, price: { [Op.gt]: 0 } },
                    attributes: ['createdAt'],
                    order: [['createdAt', 'ASC']]
                });
                const goldRecord = await GoldPackageHistory.findOne({
                    where: { user_id: userId, price: { [Op.gt]: 0 } },
                    attributes: ['createdAt'],
                    order: [['createdAt', 'ASC']]
                });
                const masonicRecord = await MasonicPackageHistory.findOne({
                    where: { user_id: userId, price: { [Op.gt]: 0 } },
                    attributes: ['createdAt'],
                    order: [['createdAt', 'ASC']]
                });
                const policyRecord = await PolicyPackageHistory.findOne({
                    where: { user_id: userId, price: { [Op.gt]: 0 } },
                    attributes: ['createdAt'],
                    order: [['createdAt', 'ASC']]
                });
                const goldApprRecord = await GoldAppreciationPackageHistory.findOne({
                    where: { user_id: userId, price: { [Op.gt]: 0 } },
                    attributes: ['createdAt'],
                    order: [['createdAt', 'ASC']]
                });

                const dates = [federalRecord, goldRecord, masonicRecord, policyRecord, goldApprRecord]
                    .filter(record => record != null)
                    .map(record => record.createdAt);
                const earliestDate = new Date(Math.min(...dates.map(date => new Date(date).getTime())));

                await User.update({ initial_buy_product_date: earliestDate }, { where: { id: userId } });
                console.log(`Set initial_buy_product_date for User ID ${userId} to ${earliestDate}`);
            }
        } catch (error) {
            errLogger(`[SET_INITIAL_BUY_PRODUCT_DATE]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_USER = async () => {
        try {
            // get all users with createdAt < '2026-04-10'
            // column: id, phone_number, balance, withdraw_active_code, is_withdraw_active_code_used, createdAt
            // write to xlsx file
            console.log(`Exporting users created before 2026-04-10...`);
            const users = await User.findAll({
                where: {
                    createdAt: {
                        [Op.lt]: '2026-04-10 00:00:00'
                    },
                    type: 2, // regular users only
                },
                attributes: ['id', 'phone_number', 'balance', 'withdraw_active_code', 'is_withdraw_active_code_used', 'is_internal_account', 'createdAt'],
                order: [['createdAt', 'ASC']]
            });

            const xlsx = require('xlsx');
            console.log(`Exporting ${users.length} users to Excel...`);
            const data = users.map(async user => {
                const userLog = await UserLog.findOne({
                    where: { user_id: user.id },
                    attributes: ['createdAt'],
                    order: [['createdAt', 'DESC']],
                });
                const lastLogin = userLog ? moment(userLog.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-';
                console.log(`Processing User ID ${user.id}: Last Login - ${lastLogin}`);
                return {
                    id: user.id,
                    "手机号": user.phone_number,
                    "余额": Number(user.balance),
                    "激活码": user.withdraw_active_code || '-',
                    "激活码状态": user.is_withdraw_active_code_used ? '已使用' : '未使用',
                    "注册时间": user.createdAt ? moment(user.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
                    "是否内部号": user.is_internal_account ? '是' : '否',
                    "最后登录时间": lastLogin,
                };
            });

            const worksheet = xlsx.utils.json_to_sheet(await Promise.all(data));
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');
            xlsx.writeFile(workbook, 'users.xlsx');

            console.log(`Export completed. File saved as users.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_USER]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_USER_MAY_9_LAST_LOGIN = async () => {
        try {
            const [result] = await db.query(`
                SELECT u.id, u.phone_number, u.balance, ul.last_login_at
                FROM users u
                JOIN (
                    SELECT user_id, MAX(createdAt) AS last_login_at
                    FROM user_logs
                    GROUP BY user_id
                    HAVING MAX(createdAt) <= '2026-05-09 23:59:59'
                ) ul ON ul.user_id = u.id
                WHERE u.is_withdraw_active_code_used = 0
                AND u.is_internal_account = 0
                AND u.balance > 0
                AND u.type = 2
                AND u.createdAt < '2026-04-10 00:00:00';
            `);

            const xlsx = require('xlsx');
            console.log(`Exporting ${result.length} users to Excel...`);
            const data = result.map(user => ({
                id: user.id,
                "手机号": user.phone_number,
                "余额": Number(user.balance),
                "最后登录时间": user.last_login_at ? moment(user.last_login_at).format('YYYY-MM-DD HH:mm:ss') : '-',
            }));
            const worksheet = xlsx.utils.json_to_sheet(data);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Users_May_9_Last_Login');
            xlsx.writeFile(workbook, 'users_may_9_last_login.xlsx');

            console.log(`Export completed. File saved as users_may_9_last_login.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_USER_MAY_9_LAST_LOGIN]: ${error.stack}`);
        }
    }

    SEND_WITHDRAWAL_TO_THIRD_PARTY = async () => {
        try {
            const isProcessing = await this.redisHelper.getValue('is_sending_withdrawal_to_third_party');
            if (isProcessing) {
                return;
            }

            const channels = await WithdrawMerchantChannel.findAll({
                include: {
                    model: WithdrawMerchant,
                    as: 'withdraw_merchant',
                },
                attributes: ['id', 'withdraw_method', 'merchant_channel']
            });

            for (const channel of channels) {

                const withdraws = await this.redisHelper.getValue(`withdraw_channel_${channel.id}_queue`);
                if (!withdraws || withdraws.length === 0) {
                    continue;
                }

                const withdrawIds = JSON.parse(withdraws);
                for (const wdId of withdrawIds) {
                    const withdraw = await Withdraw.findByPk(wdId);
                    if (!withdraw) {
                        continue;
                    }
                    
                    let payload = null;
                    let headers = { "Content-Type": "application/x-www-form-urlencoded" }
                    const requestAmount = Number(withdraw.amount) - Number(withdraw.handle_fee);
                    const paymentMethod = await PaymentMethod.findOne({ 
                        where: { user_id: withdraw.user_id },
                        attributes: ['id', 'bank_card_number', 'bank_card_name', 'ali_account_number', 'ali_account_name']
                    });

                    switch (channel.withdraw_merchant.app_code) {
                        case 'xpay360':
                            payload = await this.merchantController.XPAY360DAIFU(channel, requestAmount, withdraw.user_id, paymentMethod, withdraw.type, withdraw.order_no);
                            headers = { "Content-Type": "application/json" }
                            break;
                        default:
                            return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '不支持的商户', {});
                    }
                    if (!payload) {
                        continue;
                    }

                    try {
                        if (channel.withdraw_merchant.app_code === 'xpay360') {
                            const url = channel.withdraw_merchant.api + '?sign=' + payload.sign;
                            console.log(payload.sign);
                            delete payload.sign;
                            console.log(payload);

                            // await axios.post(url, payload, {
                            //     headers: headers
                            // });
                        }
                    } catch (error) {
                        errLogger(`[SEND_WITHDRAWAL_TO_THIRD_PARTY][Request Error][${withdraw.id}]: ${error.stack}`);
                    }
                }

                const processChannels = await this.redisHelper.getValue('withdraw_channel_processes');
                let channelIds = [];
                if (processChannels) {
                    channelIds = JSON.parse(processChannels);
                }

                // remove current channel from array and update redis
                channelIds = channelIds.filter(id => id !== channel.id);
                if (channelIds.length === 0) {
                    await this.redisHelper.deleteKey('withdraw_channel_processes');
                    await this.redisHelper.deleteKey('is_sending_withdrawal_to_third_party');
                } else {
                    await this.redisHelper.setValue('withdraw_channel_processes', JSON.stringify(channelIds));
                }
                
                await this.redisHelper.deleteKey(`withdraw_channel_${channel.id}_queue`);
            }
            
            if (channels.length > 0) {
                console.log('Finished processing withdrawal channels for third party sending.');
            }
        } catch (error) {
            errLogger(`[SEND_WITHDRAWAL_TO_THIRD_PARTY]: ${error.stack}`);
        }
    }

    UPDATE_MEETING_USED_CODE = async () => {
        try {
            const activeMeeting = await this.redisHelper.getValue('active_meeting');
            if (activeMeeting) {
                const parsed = JSON.parse(activeMeeting);
                if (parsed.is_active !== 0) {
                    await Meeting.update({ used_code: parsed.used_code || 0 }, { where: { id: parsed.id } });
                }
            }
        } catch (error) {
            errLogger(`[UPDATE_MEETING_USED_CODE]: ${error.stack}`);
        }
    }

    // NOT CRON
    READ_EXCEL_FILE_AND_UPDATE_USER_BALANCE = async () => {
        try {
            // filepath READ file from main directory
            const filepath = 'update_balance.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            for (const row of data) {
                const t = await db.transaction();
                try {
                    const user = await User.findOne({ where: { id: row.id, balance: { [Op.gt]: 0 } }, attributes: ['id'], transaction: t });
                    console.log(`Processing User ID ${row?.id} for balance update...`);
                    if (!user) {
                        continue;
                    }
                    await user.update({ balance: 0 }, { transaction: t });
                    await t.commit();

                    commonLogger(`Updated balance for User ID ${row.id} to 0. [original balance: ${row["余额"]}]`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[READ_EXCEL_FILE_AND_UPDATE_USER_BALANCE]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[READ_EXCEL_FILE_AND_UPDATE_USER_BALANCE]: ${error.stack}`);
        }
    }

    RELEASE_MEETING_REWARD = async () => {
        const processingKey = 'is_releasing_meeting_reward';
        try {
            const isProcessing = await this.redisHelper.getValue(processingKey);
            if (isProcessing) {
                return;
            }

            await this.redisHelper.setValue(processingKey, 1);

            while (true) {

                const QUEUE_KEY = 'QUEUE:MEETING_REWARD_PROCESS';
                const item = await this.redisHelper.lPopValue(QUEUE_KEY);
                if (!item) {
                    break; 
                    return;
                }

                const queue = JSON.parse(item);
                const { user_id: userId, meeting_id: meetingId, meeting_code: meetingCode, reward_amount: rewardAmount } = queue;

                const t = await db.transaction();
                try {

                    const user = await User.findByPk(userId, { attributes: ['id', 'relation', 'balance'], transaction: t });

                    await AttendedMeeting.create({
                        relation: user.relation,
                        user_id: userId,
                        meeting_id: meetingId,
                        meeting_code: meetingCode,
                        reward_amount: rewardAmount
                    }, { transaction: t });

                    await CashFlow.create({
                        relation: user.relation,
                        user_id: userId,
                        wallet_type: 2,
                        model: 'Meeting',
                        type: `参加会议获得奖励`,
                        amount: rewardAmount,
                        before_amount: Number(user.balance),
                        after_amount: Number(user.balance) + rewardAmount,
                        flow_status: 'IN',
                    }, { transaction: t });

                    await user.increment({ balance: rewardAmount }, { transaction: t });
                    await this.redisHelper.setValue(`attended_meeting_${userId}_${meetingId}`, '1', 3600); // cache for 1 hour

                    await t.commit();

                    commonLogger(`[RELEASE_MEETING_REWARD][User ID: ${userId}]: Released meeting reward of ${rewardAmount}.`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[RELEASE_MEETING_REWARD][Transaction][User ID: ${userId}]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[RELEASE_MEETING_REWARD][User ID: ${userId}]: ${error.stack}`);
        } finally {
            await this.redisHelper.deleteKey(processingKey);
        }
    }

    RELEASE_USER_ACTIVE_STATUS = async () => {
        const processingKey = 'is_releasing_user_active_status';
        try {
            const isProcessing = await this.redisHelper.getValue(processingKey);
            if (isProcessing) {
                return;
            }

            await this.redisHelper.setValue(processingKey, 1);

            while (true) {

                const QUEUE_KEY = 'QUEUE:USER_ACTIVE_STATUS_PROCESS';
                const item = await this.redisHelper.lPopValue(QUEUE_KEY);
                if (!item) {
                    break; 
                    return;
                }

                const queue = JSON.parse(item);
                const { user_id, activedAt } = queue;
                await User.update({ isActive: 1, activedAt: activedAt }, { where: { id: user_id } });
            }
        } catch (error) {
            errLogger(`[RELEASE_USER_ACTIVE_STATUS]: ${error.stack}`);
        } finally {
            await this.redisHelper.deleteKey(processingKey);
        }
    }

    // NOT CRON
    MOVE_AUTHORIZE_LETTER = async () => {
        try {
            const now = new Date();
            console.log(`Starting to move authorize letter history at ${now.toISOString()}...`);
            
            const rewardRecords = await RewardRecord.findAll({
                where: {
                    reward_id: {
                        [Op.in]: [6, 11, 12, 13]
                    }
                },
                attributes: ['id', 'user_id', 'relation', 'reward_id', 'amount', 'is_used', 'from_where', 'createdAt']
            });
            console.log(`Found ${rewardRecords.length} reward records to process for moving authorize letter history.`);

            for (const record of rewardRecords) {
                const t = await db.transaction();
                try {
                    let letterId = null;
                    let desc = record.from_where || null;
                    let product_type = 0;
                    if (record.reward_id == 6) {
                        letterId = 1;
                    } else if (record.reward_id == 11) {
                        letterId = 2;
                        product_type = 3; // 终身授权
                    } else if (record.reward_id == 12) {
                        letterId = 3;
                        product_type = 5; // 联储
                    } else if (record.reward_id == 13) {
                        letterId = 4;
                        product_type = 4; // 贡献
                    }
                    if (letterId) {
                        const exist = await AuthorizeLetterHistory.findOne({
                            where: {
                                user_id: record.user_id,
                                letter_id: letterId,
                                price: record.amount,
                                createdAt: record.createdAt,
                            },
                            attributes: ['id'],
                            transaction: t
                        });
                        if (!exist) {
                            await AuthorizeLetterHistory.create({
                                user_id: record.user_id,
                                relation: record.relation,
                                letter_id: letterId,
                                price: record.amount,
                                gold_count: letterId == 1 ? 0 : 1000,
                                gold_owner_id: record.user_id,
                                is_used: record.is_used,
                                product_type: product_type,
                                description: desc,
                                createdAt: record.createdAt,
                            }, { transaction: t });
                        }
                    }

                    await t.commit();
                    console.log(`Moved reward record ID ${record.reward_id} to authorize letter history with letter ID ${letterId}.`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[MOVE_AUTHORIZE_LETTER][Transaction][Record ID: ${record.id}]: ${error.stack}`);
                }
            }
            console.log(`Completed moving authorize letter history at ${new Date().toISOString()}.`);
        } catch (error) {
            errLogger(`[MOVE_AUTHORIZE_LETTER]: ${error.stack}`);
        }
    }

    // NOT CRON
    FROZEN_USER = async () => {
        try {
            const filepath = 'phones.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            for (const row of data) {
                const phoneNumber = row['phone_number'];
                if (!phoneNumber) {
                    continue;
                }
                const user = await User.findOne({ where: { phone_number: phoneNumber }, attributes: ['id'] });
                if (user) {
                    await User.update({ status: 0 }, { where: { id: user.id } });
                    await this.redisHelper.deleteKey(`user_token_${user.id}`);
                    console.log(`Frozen user with phone number ${phoneNumber}`);
                } else {
                    console.log(`No user found with phone number ${phoneNumber}`);
                }
            }

            console.log(`Completed freezing users from file ${filepath}.`);
        } catch (error) {
            errLogger(`[FROZEN_USER]: ${error.stack}`);
        }
    }

    // NOT CRON
    READ_EXCEL_FILE_EXPORT_STATUS = async () => {
        try {
            // filepath READ file from main directory
            const filepath = 'phonenumbers.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const users = [];
            for (const row of data) {
                console.log(`Processing phone number ${row.phone_number} for status export...`);
                const user = await User.findOne({ where: { phone_number: row.phone_number }, attributes: ['id', 'name', 'phone_number', 'balance', 'reserve_fund', 'status', 'initial_buy_product_date'] });
                if (!user) {
                    continue;
                }

                // last buy product time
                // const PolicyTime = await PolicyPackageHistory.findOne({
                //     where: { user_id: user.id },
                //     attributes: ['createdAt'],
                //     order: [['createdAt', 'ASC']]
                // });
                // const GoldTime = await GoldPackageHistory.findOne({
                //     where: { user_id: user.id },
                //     attributes: ['createdAt'],
                //     order: [['createdAt', 'ASC']]
                // });
                // const FederalTime = await FederalReserveGoldPackageHistory.findOne({
                //     where: { user_id: user.id },
                //     attributes: ['createdAt'],
                //     order: [['createdAt', 'ASC']]
                // });
                // const MasonicTime = await MasonicPackageHistory.findOne({
                //     where: { user_id: user.id },
                //     attributes: ['createdAt'],
                //     order: [['createdAt', 'ASC']]
                // });
                // const goldAppreciationTime = await GoldAppreciationPackageHistory.findOne({
                //     where: { user_id: user.id },
                //     attributes: ['createdAt'],
                //     order: [['createdAt', 'ASC']]
                // });

                // const lastBuyTime = Math.max(
                //     PolicyTime ? new Date(PolicyTime.createdAt).getTime() : 0,
                //     GoldTime ? new Date(GoldTime.createdAt).getTime() : 0,
                //     FederalTime ? new Date(FederalTime.createdAt).getTime() : 0,
                //     MasonicTime ? new Date(MasonicTime.createdAt).getTime() : 0,
                //     goldAppreciationTime ? new Date(goldAppreciationTime.createdAt).getTime() : 0
                // );

                users.push({
                    id: user.id,
                    '姓名': user.name,
                    '手机号': user.phone_number,
                    '余额': Number(user.balance),
                    '储备金': Number(user.reserve_fund),
                    '状态': user.status == 0 ? '冻结' : '正常',
                    '首次购买时间': user.initial_buy_product_date ? moment(user.initial_buy_product_date).format('YYYY-MM-DD HH:mm:ss') : '-',
                });
            }

            const worksheet = xlsx.utils.json_to_sheet(users);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'User Status');
            xlsx.writeFile(workbook1, 'user_status.xlsx');

            console.log(`Export completed. File saved as user_status.xlsx`);
        } catch (error) {
            errLogger(`[READ_EXCEL_FILE_EXPORT_STATUS]: ${error.stack}`);
        }
    }

    // NOT CRON
    UNFREEZE_USER = async () => {
        try {
            const filepath = 'unfreeze_phones.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            for (const row of data) {
                const phoneNumber = row['phone_number'];
                if (!phoneNumber) {
                    continue;
                }
                const user = await User.findOne({ where: { phone_number: phoneNumber }, attributes: ['id', 'balance'] });
                if (!user) {
                    continue;
                }
                // if (row['处置'] == '解封') {
                //     await User.update({ status: 1 }, { where: { id: user.id } });
                //     console.log(`Unfrozen user with phone number ${phoneNumber}`);
                // }
                if (row['资金'] === '清零') {
                    await User.update({ balance: 0 }, { where: { id: user.id } });
                    commonLogger(`Reset balance to 0 [Origin: ${user.balance}] for user with phone number ${phoneNumber} [Id: ${user.id}]`);
                }
            }

            console.log(`Completed unfreezing users from file ${filepath}.`);
        } catch (error) {
            errLogger(`[UNFREEZE_USER]: ${error.stack}`);
        }
    }

    // NOT CRON
    REPAIR_XLSX = async () => {
        try {
            const filepath = '提现异常.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const list = [];
            for (const row of data) {
                const userId = row['用户ID'];
                const user = await User.findByPk(userId, { attributes: ['id', 'password', 'payment_password', 'initial_buy_product_date'] });
                if (!user) {
                    continue;
                }
                list.push({
                    '顶级账号名称': row['顶级账号名称'],
                    '顶级账号': row['顶级账号'],
                    '用户ID': userId,
                    '会员名': row['会员名'],
                    '用户账号': row['用户账号'],
                    '到账金额': row['到账金额'],
                    '提现时间': row['提现时间'],
                    '银行卡号': row['银行卡号'],
                    '银行名称': row['银行名称'],
                    '持卡人': row['持卡人'],
                    '支付宝账号': row['支付宝账号'],
                    '支付宝姓名': row['支付宝姓名'],
                    '首次购买时间': user.initial_buy_product_date ? moment(user.initial_buy_product_date).format('YYYY-MM-DD HH:mm:ss') : '-',
                    '登录密码': user.password,
                    '支付密码': user.payment_password,
                });
                console.log(`Processed User ID ${userId} for withdrawal error repair export...`);
            }

            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'User Status');
            xlsx.writeFile(workbook1, 'withdrawal_error.xlsx');

            console.log(`Export completed. File saved as withdrawal_error.xlsx`);
        } catch (error) {
            errLogger(`[REPAIR_XLSX]: ${error.stack}`);
        }
    }

    // NOT CRON
    REFUND_WITHDRAWAL_XLSX = async () => {
        try {
            const filepath = '提现处理_含提现ID.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const withdraws = [];
            for (const row of data) {
                const wId = row['提现ID'];
                const isRefund = row['是否驳回'] === '是';
                const isClear = row['是否清零'] === '是';
                const withdraw = await Withdraw.findByPk(wId, { attributes: ['id', 'user_id', 'amount', 'status', 'createdAt'] });
                if (!withdraw || withdraw.status != 0) {
                    continue;
                }
                
                const wObj = {
                    '提现ID': wId,
                    '用户ID': withdraw.user_id,
                    '提现金额': withdraw.amount,
                    '当前余额': '',
                    '驳回后余额': '',
                    '是否驳回': '',
                    '已清零': '',
                    '提现时间': withdraw.createdAt ? moment(withdraw.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                    '登录密码': row['登录密码'] || '',
                    '支付密码': row['支付密码'] || '',
                }

                if (isRefund) {
                    const t = await db.transaction();
                    try {
                        const user = await User.findByPk(withdraw.user_id, { attributes: ['id', 'relation', 'balance'], transaction: t });
                        if (!user) {
                            await t.rollback();
                            continue;
                        }
                        wObj['当前余额'] = user.balance;
                        wObj['驳回后余额'] = Number(user.balance) + Number(withdraw.amount);
                        wObj['是否驳回'] = '是';

                        await CashFlow.create({
                            relation: user.relation,
                            user_id: user.id,
                            wallet_type: 2,
                            model: 'Withdraw',
                            type: `提现`,
                            amount: withdraw.amount,
                            before_amount: Number(user.balance),
                            after_amount: Number(user.balance) + Number(withdraw.amount),
                            flow_status: 'IN',
                            description: '系统-退款提现金额'
                        }, { transaction: t });

                        await user.increment({ balance: withdraw.amount }, { transaction: t });
                        await withdraw.update({ status: 2, description: '系统-退款提现金额' }, { transaction: t });

                        await t.commit();
                        console.log(`Refunded withdrawal ID ${wId} amount ${withdraw.amount} to User ID ${user.id} due to rejection.`);
                    } catch (error) {
                        await t.rollback();
                        errLogger(`[REFUND_WITHDRAWAL_XLSX][Transaction][Withdraw ID: ${wId}]: ${error.stack}`);
                    }
                }

                withdraws.push(wObj);
                console.log(`Processed withdrawal ID ${wId} for refund/clear export...`);
            }

            const worksheet = xlsx.utils.json_to_sheet(withdraws);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Withdraw Refund Clear');
            xlsx.writeFile(workbook1, 'withdrawal_fund_clear.xlsx');

            console.log(`Export completed. File saved as withdrawal_fund_clear.xlsx`);
        } catch (error) {
            errLogger(`[REFUND_WITHDRAWAL_XLSX]: ${error.stack}`);
        }
    }
    
    // NOT CRON
    CLEAR_WITHDRAWAL_XLSX = async () => {
        try {
            const filepath = '提现处理_含提现ID.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const withdraws = [];
            for (const row of data) {
                const wId = row['提现ID'];
                const isRefund = row['是否驳回'] === '是';
                const isClear = row['是否清零'] === '是';
                const withdraw = await Withdraw.findByPk(wId, { attributes: ['id', 'user_id', 'amount', 'status', 'createdAt'] });
                if (!withdraw) {
                    continue;
                }
                
                const wObj = {
                    '提现ID': wId,
                    '用户ID': withdraw.user_id,
                    '提现金额': withdraw.amount,
                    '是否驳回': isRefund ? '是' : '',
                    '清零前余额': '',
                    '已清零': '',
                    '提现时间': withdraw.createdAt ? moment(withdraw.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                    '登录密码': row['登录密码'] || '',
                    '支付密码': row['支付密码'] || '',
                }

                const user = await User.findByPk(withdraw.user_id, { attributes: ['id', 'relation', 'balance'] });
                if (!user) {
                    continue;
                }
                if (isClear) {
                    wObj['清零前余额'] = user.balance;
                    wObj['已清零'] = '是';
                    await user.update({ balance: 0 });
                }

                withdraws.push(wObj);
                console.log(`Processed withdrawal ID ${wId} for refund/clear export...`);
            }

            const worksheet = xlsx.utils.json_to_sheet(withdraws);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Withdrawals');
            xlsx.writeFile(workbook1, 'withdrawal_fund_clear_complete.xlsx');

            console.log(`Export completed. File saved as withdrawal_fund_clear_complete.xlsx`);
        } catch (error) {
            errLogger(`[CLEAR_WITHDRAWAL_XLSX]: ${error.stack}`);
        }
    }

    // NOT CRON
    GET_ALL_FROZEN_USERS = async () => {
        try {
            const xlsx = require('xlsx');
            const frozenUsers = await User.findAll({
                include: [
                    {
                        model: User,
                        as: 'parent',
                        attributes: ['id', 'name', 'phone_number']
                    },
                    {
                        model: User,
                        as: 'top_account',
                        attributes: ['id', 'name', 'phone_number']
                    }
                ],
                where: { status: 0 },
                attributes: ['id', 'name', 'phone_number', 'balance', 'reserve_fund', 'password', 'payment_password', 'initial_buy_product_date'],
                order: [['id', 'ASC']]
            });

            const users = frozenUsers.map(user => ({
                "用户ID": user.id,
                "姓名": user.name,
                "手机号": user.phone_number,
                "余额": Number(user.balance),
                "储备金": Number(user.reserve_fund),
                "登录密码": user.password,
                "支付密码": user.payment_password,
                "首次购买时间": user.initial_buy_product_date ? moment(user.initial_buy_product_date).format('YYYY-MM-DD HH:mm:ss') : '-',
                "上级姓名": user.parent ? `${user.parent.name}` : '',
                "上级手机号": user.parent ? `${user.parent.phone_number}` : '',
                "顶级姓名": user.top_account ? `${user.top_account.name}` : '',
                "顶级手机号": user.top_account ? `${user.top_account.phone_number}` : '',
            }));

            const worksheet = xlsx.utils.json_to_sheet(users);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Frozen Users');
            xlsx.writeFile(workbook, 'frozen_users.xlsx');

            console.log(`Export completed. File saved as frozen_users.xlsx`);
        } catch (error) {
            errLogger(`[GET_ALL_FROZEN_USERS]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_MINUS_BALANCE = async () => {
        try {
            const users = await User.findAll({
                where: {
                    balance: { [Op.lt]: 0 }
                },
                attributes: ['id', 'name', 'phone_number', 'balance', 'initial_buy_product_date', 'createdAt']
            });

            const list = [];
            for (const user of users) {
                console.log(`Processing User ID ${user.id} for balance export...`);
                list.push({
                    "用户ID": user.id,
                    "姓名": user.name,
                    "手机号": user.phone_number,
                    "余额": Number(user.balance),
                    "首次购买时间": user.initial_buy_product_date ? moment(user.initial_buy_product_date).format('YYYY-MM-DD HH:mm:ss') : '-',
                    "注册时间": user.createdAt ? moment(user.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-',
                });
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Users');
            xlsx.writeFile(workbook1, 'balance_lt_0.xlsx');
        } catch (error) {
            errLogger(`[MINUS_BALANCE]: ${error.stack}`);
        }
    }

    // NOT CRON
    REFUND_WITHDRAWAL = async () => {
        try {
            const result = await Withdraw.findAll({
                attributes: [
                    'user_id',
                    [fn('COUNT', col('*')), 'total_count'],
                ],
                where: {
                    status: 0,
                    createdAt: {
                        [Op.gt]: '2026-06-23',
                    },
                },
                group: ['user_id'],
                having: literal('total_count > 1'),
            });

            const withdrawToRefund = [];
            for (const row of result) {
                const withdraws = await Withdraw.findAll({
                    where: {
                        user_id: row.user_id,
                        status: 0,
                        createdAt: {
                            [Op.gt]: '2026-06-23',
                        },
                    },
                    attributes: ['id', 'user_id', 'amount', 'order_no', 'createdAt'],
                    order: [['createdAt', 'DESC']],
                    limit: row.dataValues.total_count - 1, // keep the latest one
                });
                // Process the withdraws for each user
                for (const withdraw of withdraws) {
                    const t = await db.transaction();
                    try {
                        const user = await User.findByPk(withdraw.user_id, { attributes: ['id', 'name', 'phone_number', 'relation', 'balance'], transaction: t });
                        if (!user) {
                            await t.rollback();
                            continue;
                        }

                        withdrawToRefund.push({
                            "提现ID": withdraw.id,
                            "提现订单号": withdraw.order_no,
                            "用户ID": user.id,
                            "姓名": user.name,
                            "手机号": user.phone_number,
                            "提现金额": withdraw.amount,
                            "提现时间": withdraw.createdAt ? moment(withdraw.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                        });

                        await CashFlow.create({
                            relation: user.relation,
                            user_id: user.id,
                            wallet_type: 2,
                            model: 'Withdraw',
                            type: `提现`,
                            amount: withdraw.amount,
                            before_amount: Number(user.balance),
                            after_amount: Number(user.balance) + Number(withdraw.amount),
                            flow_status: 'IN',
                            description: '系统-退款提现金额'
                        }, { transaction: t });

                        await user.increment({ balance: withdraw.amount }, { transaction: t });
                        await withdraw.update({ status: 2, description: '系统-退款提现金额' }, { transaction: t });
                        await t.commit();

                        commonLogger(`Refunded withdrawal ID ${withdraw.id} amount ${withdraw.amount} to User ID ${user.id} due to multiple withdrawals on the same day.`);
                    } catch (error) {
                        await t.rollback();
                        errLogger(`[REFUND_WITHDRAWAL][Transaction][Withdraw ID: ${withdraw.id}]: ${error.stack}`);
                    }
                }
            }

            // Export to Excel
            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(withdrawToRefund);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Refunded Withdrawals');
            xlsx.writeFile(workbook, 'refund_withdrawals.xlsx');

            console.log(`Export completed. File saved as refund_withdrawals.xlsx`);
        } catch (error) {
            errLogger(`[REFUND_WITHDRAWAL]: ${error.stack}`);
        }
    }

    // NOT CRON
    RELEASE_POLICY_LETTER = async () => {
        try {
            const xlsx = require('xlsx');
            const filepath = 'policy_letter_release.xlsx';
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            for (const row of data) {
                const userId = row['用户ID'];
                const user = await User.findByPk(userId, { attributes: ['id','relation'] });
                if (!user) {
                    console.log(`User ID ${userId} not found. Skipping...`);
                    continue;
                }
                const packageHistoryId = row['序号'];
                const history = await PolicyPackageHistory.findByPk(packageHistoryId, { attributes: ['id'] });
                if (!history) {
                    console.log(`PolicyPackageHistory ID ${packageHistoryId} not found. Skipping...`);
                    continue;
                }
                const letterHistory = await AuthorizeLetterHistory.findOne({
                    where: {
                        user_id: userId,
                        product_type: 4,
                        letter_id: 4,
                        description: `PKG-${packageHistoryId}`,
                    }
                });
                if (letterHistory) {
                    console.log(`AuthorizeLetterHistory already exists for User ID ${userId} and PolicyPackageHistory ID ${packageHistoryId}. Skipping...`);
                    continue;
                }
                await AuthorizeLetterHistory.create({
                    user_id: user.id,
                    relation: user.relation,
                    letter_id: 4,
                    price: 0,
                    gold_count: 1000,
                    gold_owner_id: user.id,
                    product_type: 4, // 贡献
                    description: `PKG-${packageHistoryId}`,
                });

                console.log(`Released policy letter for User ID ${userId} and PolicyPackageHistory ID ${packageHistoryId}.`);
            }

            console.log(`Completed releasing policy letters from file ${filepath}. Length: ${data.length}`);
        } catch (error) {
            errLogger(`[RELEASE_POLICY_LETTER]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_CASH_FLOW = async () => {
        try {
            // between '2026-06-21' and '2026-06-25'
            const cashFlows = await CashFlow.findAll({
                where: {
                    createdAt: {
                        [Op.between]: ['2026-06-23', '2026-06-24']
                    },
                    // type: {
                    //     [Op.in]: ['购买上合终身授权', '购买联储黄金礼包', '购买上合贡献政策礼包', '购买上海合作组织', '购买联储黄金礼包']
                    // }
                },
                attributes: ['id', 'user_id', 'wallet_type', 'model', 'type', 'amount', 'before_amount', 'after_amount', 'flow_status', 'description', 'createdAt'],
                order: [['createdAt', 'ASC']]
            });

            const list = [];
            for (const flow of cashFlows) {
                const user = await User.findByPk(flow.user_id, { attributes: ['id', 'name', 'phone_number'] });
                console.log(`Processing CashFlow ID ${flow.id} for export...`);
                let type = flow.type;
                switch (flow.type) {
                    case '购买上合终身授权':
                        type = '终身授权';
                        break;
                    case '购买联储黄金礼包':
                        type = '联储';
                        break;
                    case '购买上合贡献政策礼包':
                        type = '贡献';
                        break;
                    case '购买上海合作组织':
                        type = '上海合作组织';
                        break;
                    case '购买联储黄金礼包':
                        type = '联储黄金';
                        break;
                    default:
                        type = flow.type;
                        break;
                }

                list.push({
                    "流水ID": flow.id,
                    "用户ID": flow.user_id,
                    "姓名": user ? user.name : '',
                    "手机号": user ? user.phone_number : '',
                    "钱包类型": flow.wallet_type == 1 ? '储备金' : '余额',
                    "产品类型": type,
                    "金额": Number(flow.amount),
                    "变动前金额": Number(flow.before_amount),
                    "变动后金额": Number(flow.after_amount),
                    "流水状态": flow.flow_status === 'IN' ? '收入' : '支出',
                    "描述": flow.description,
                    "创建时间": flow.createdAt ? moment(flow.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                });
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Cash Flows');
            xlsx.writeFile(workbook1, 'cash_flows_export.xlsx');

            console.log(`Export completed. File saved as cash_flows_export.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_CASH_FLOW]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_POLICY_PACKAGE_HISTORY = async () => {
        try {
            const rows = await PolicyPackageHistory.findAll({
                include: [
                    {
                        model: PolicyPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number']
                    }
                ],
                where: {
                    createdAt: {
                        [Op.between]: ['2026-06-21', '2026-06-25']
                    }
                },
            });

            const list = [];
            for (const row of rows) {
                list.push({
                    "订单号": row.id,
                    "用户ID": row.user_id,
                    "姓名": row.user ? row.user.name : '',
                    "手机号": row.user ? row.user.phone_number : '',
                    "产品名称": row.package ? row.package.product_name : '',
                    "购买金额": row.price,
                    "购买时间": row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                });
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Policy Package History');
            xlsx.writeFile(workbook1, 'policy_package_history_export.xlsx');

            console.log(`Export completed. File saved as policy_package_history_export.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_POLICY_PACKAGE_HISTORY]: ${error.stack}`); 
        }
    }

    // NOT CRON
    EXPORT_FEDERAL_RESERVE_GOLD_PACKAGE_HISTORY = async () => {
        try {
            const rows = await FederalReserveGoldPackageHistory.findAll({
                include: [
                    {
                        model: FederalReserveGoldPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number']
                    }
                ],
                where: {
                    createdAt: {
                        [Op.between]: ['2026-06-21', '2026-06-25']
                    }
                },
            });

            const list = [];
            for (const row of rows) {
                const list = [];
                list.push({
                    "订单号": row.id,
                    "用户ID": row.user_id,
                    "姓名": row.user ? row.user.name : '',
                    "手机号": row.user ? row.user.phone_number : '',
                    "产品名称": row.package ? row.package.product_name : '',
                    "购买金额": Number(row.price),
                    "购买时间": row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                });
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Federal Reserve Gold Package History');
            xlsx.writeFile(workbook1, 'federal_reserve_gold_package_history_export.xlsx');

            console.log(`Export completed. File saved as federal_reserve_gold_package_history_export.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_FEDERAL_RESERVE_GOLD_PACKAGE_HISTORY]: ${error.stack}`);
        }
    }
    
    // NOT CRON
    EXPORT_SHANGHAI_COOPERATION_HISTORY = async () => {
        try {
            const rows = await ShanghaiCooperationHistory.findAll({
                include: [
                    {
                        model: ShanghaiCooperation,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number']
                    }
                ],
                where: {
                    createdAt: {
                        [Op.between]: ['2026-06-21', '2026-06-25']
                    }
                },
            });

            const list = [];
            for (const row of rows) {
                list.push({
                    "订单号": row.id,
                    "用户ID": row.user_id,
                    "姓名": row.user ? row.user.name : '',
                    "手机号": row.user ? row.user.phone_number : '',
                    "产品名称": row.package ? row.package.product_name : '',
                    "购买金额": Number(row.price),
                    "购买时间": row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                });
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Shanghai Cooperation History');
            xlsx.writeFile(workbook1, 'shanghai_cooperation_history_export.xlsx');

            console.log(`Export completed. File saved as shanghai_cooperation_history_export.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_SHANGHAI_COOPERATION_HISTORY]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_GOLD_APPRECIATION_PACKAGE_HISTORY = async () => {
        try {
            const rows = await GoldAppreciationPackageHistory.findAll({
                include: [
                    {
                        model: GoldAppreciationPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number']
                    }
                ],
                where: {
                    createdAt: {
                        [Op.between]: ['2026-06-21', '2026-06-25']
                    }
                }
            });

            const list = [];
            for (const row of rows) {
                list.push({
                    "订单号": row.id,
                    "用户ID": row.user_id,
                    "姓名": row.user ? row.user.name : '',
                    "手机号": row.user ? row.user.phone_number : '',
                    "产品名称": row.package ? row.package.product_name : '',
                    "购买金额": Number(row.price),
                    "购买时间": row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                });
            }
            
            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Gold Appreciation Package');
            xlsx.writeFile(workbook1, 'gold_appreciation_package_history_export.xlsx');

            console.log(`Export completed. File saved as gold_appreciation_package_history_export.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_GOLD_APPRECIATION_PACKAGE_HISTORY]: ${error.stack}`);
        }
    }

    // NOT CRON
    DELETE_POLICY = async () => {
        try {
            const filepath = 'delete-policy.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const bonusNotEnoughtToDelete = [];
            for (const row of data) {
                const productName = row['产品名'];
                if (!productName || !row['订单号']) {
                    console.log(`Row missing product name or order number. Skipping...`);
                    continue;
                }

                // check productName contain 贡献政策
                if (!productName.includes('贡献政策')) {
                    continue;
                }

                const historyId = Number(row['订单号']);
                const history = await PolicyPackageHistory.findByPk(historyId, { attributes: ['id', 'user_id', 'price'] });
                if (!history) {
                    console.log(`PolicyPackageHistory ID ${historyId} not found. Skipping...`);
                    continue;
                }
                const user = await User.findByPk(history.user_id, { attributes: ['id', 'name', 'phone_number', 'relation'] });
                if (!user) {
                    console.log(`User ID ${history.user_id} not found. Skipping...`);
                    continue;
                }
                const bonuses = await PolicyPackageBonuses.findAll({
                    where: {
                        from_user_id: user.id,
                        package_history_id: history.id,
                    },
                    attributes: ['id', 'user_id', 'package_history_id', 'amount', 'createdAt'],
                });

                const t = await db.transaction();
                try {
                    for (const bonus of bonuses) {
                        const bonusUser = await User.findByPk(bonus.user_id, { attributes: ['id', 'name', 'relation', 'phone_number', 'balance'] });
                        if (!bonusUser) {
                            console.log(`Bonus User ID ${bonus.user_id} not found. Skipping...`);
                            continue;
                        }
                        if (Number(bonusUser.balance) < Number(bonus.amount)) {
                            bonusNotEnoughtToDelete.push({
                                "订单号": history.id,
                                "户ID": bonusUser.id,
                                "户姓名": bonusUser.name,
                                "户手机号": bonusUser.phone_number,
                                "奖金金额": Number(bonus.amount),
                                "创建时间": bonus.createdAt ? moment(bonus.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                            });
                        } else {
                            await CashFlow.create({
                                relation: bonusUser.relation,
                                user_id: bonusUser.id,
                                wallet_type: 2,
                                model: 'PolicyPackageBonuses',
                                type: `政策礼包奖金扣除`,
                                amount: -Number(bonus.amount),
                                before_amount: Number(bonusUser.balance),
                                after_amount: Number(bonusUser.balance) - Number(bonus.amount),
                                flow_status: 'OUT',
                                description: `异常订单扣除`,
                            }, { transaction: t });
                            await bonusUser.decrement({ balance: bonus.amount }, { transaction: t });
                            await bonus.destroy({ transaction: t });
                        }
                    }

                    await CashFlow.destroy({
                        where: {
                            user_id: user.id,
                            id: row['异常流水ID'],
                        },
                        transaction: t,
                    });
                    await history.destroy({ transaction: t });
                    await t.commit();
                    console.log(`Deleted PolicyPackageHistory ID ${historyId} and related bonuses for User ID ${user.id}.`);
                } catch (error) {
                    await t.rollback();
                    console.log(`Error deleting PolicyPackageHistory ID ${historyId} and related bonuses for User ID ${user.id}: ${error.message}`);
                }
            }

            if (bonusNotEnoughtToDelete.length > 0) {
                const worksheet = xlsx.utils.json_to_sheet(bonusNotEnoughtToDelete);
                const workbook1 = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook1, worksheet, 'Bonus Not Enough');
                xlsx.writeFile(workbook1, 'bonus_not_enough_to_delete_policy.xlsx');
                console.log(`Exported bonuses not enough to delete to bonus_not_enough_to_delete_policy.xlsx`);
            }

        } catch (error) {
            errLogger(`[DELETE_POLICY]: ${error.stack}`);
        }
    }

    // NOT CRON
    DELETE_GOLD_APPRECIATION = async () => {
        try {
            const filepath = 'delete-gold-appreciation.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const bonusNotEnoughtToDelete = [];
            for (const row of data) {
                const productName = row['产品名'];
                if (!productName || !row['订单号']) {
                    console.log(`Row missing product name or order number. Skipping...`);
                    continue;
                }

                // check productName contain 上合黄金增值
                if (!productName.includes('上合黄金增值')) {
                    continue;
                }

                const history = await GoldAppreciationPackageHistory.findByPk(row['订单号'], { attributes: ['id', 'user_id', 'price'] });
                if (!history) {
                    console.log(`GoldAppreciationPackageHistory ID ${row['订单号']} not found. Skipping...`);
                    continue;
                }
                const user = await User.findByPk(history.user_id, { attributes: ['id', 'name', 'phone_number', 'relation'] });
                if (!user) {
                    console.log(`User ID ${history.user_id} not found. Skipping...`);
                    continue;
                }
                const bonuses = await GoldAppreciationPackageBonuses.findAll({
                    where: {
                        from_user_id: user.id,
                        package_history_id: history.id,
                    },
                    attributes: ['id', 'user_id', 'amount', 'createdAt'],
                });

                const t = await db.transaction();
                try {
                    for (const bonus of bonuses) {
                        const bonusUser = await User.findByPk(bonus.user_id, { attributes: ['id', 'name', 'relation', 'phone_number', 'balance'] });
                        if (!bonusUser) {
                            console.log(`Bonus User ID ${bonus.user_id} not found. Skipping...`);
                            continue;
                        }
                        if (Number(bonusUser.balance) < Number(bonus.amount)) {
                            bonusNotEnoughtToDelete.push({
                                "订单号": history.id,
                                "户ID": bonusUser.id,
                                "户姓名": bonusUser.name,
                                "户手机号": bonusUser.phone_number,
                                "奖金金额": Number(bonus.amount),
                                "创建时间": bonus.createdAt ? moment(bonus.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                            });
                        } else {
                            await CashFlow.create({
                                relation: bonusUser.relation,
                                user_id: bonusUser.id,
                                wallet_type: 2,
                                model: 'GoldAppreciationPackageBonuses',
                                type: `上合黄金增值奖金扣除`,
                                amount: -Number(bonus.amount),
                                before_amount: Number(bonusUser.balance),
                                after_amount: Number(bonusUser.balance) - Number(bonus.amount),
                                flow_status: 'OUT',
                                description: `异常订单扣除`,
                            }, { transaction: t });
                            await bonusUser.decrement({ balance: bonus.amount }, { transaction: t });
                            await bonus.destroy({ transaction: t });
                        }
                    }

                    await CashFlow.destroy({
                        where: {
                            user_id: user.id,
                            id: row['异常流水ID'],
                        },
                        transaction: t,
                    });
                    await history.destroy({ transaction: t });
                    await t.commit();
                    console.log(`Deleted GoldAppreciationPackageHistory ID ${history.id} and related bonuses for User ID ${user.id}.`);
                } catch (error) {
                    await t.rollback();
                }
            }

            if (bonusNotEnoughtToDelete.length > 0) {
                const worksheet = xlsx.utils.json_to_sheet(bonusNotEnoughtToDelete);
                const workbook1 = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook1, worksheet, 'Bonus Not Enough');
                xlsx.writeFile(workbook1, 'bonus_not_enough_to_delete_gold_appreciation.xlsx');
                console.log(`Exported bonuses not enough to delete to bonus_not_enough_to_delete_gold_appreciation.xlsx`);
            }

        } catch (error) {
            errLogger(`[DELETE_GOLD_APPRECIATION]: ${error.stack}`);
        }
    }

    // NOT CRON
    DELETE_SHANGHAI_COOPERATION = async () => {
        try {
            const filepath = 'delete-shanghai-cooperation.xlsx';
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            const bonusNotEnoughtToDelete = [];
            for (const row of data) {
                const productName = row['产品名'];
                if (!productName || !row['订单号']) {
                    console.log(`Row missing product name or order number. Skipping...`);
                    continue;
                }

                // check productName contain 纪念币方案
                if (!productName.includes('纪念币方案')) {
                    continue;
                }

                const history = await ShanghaiCooperationHistory.findByPk(row['订单号'], { attributes: ['id', 'user_id', 'price'] });
                if (!history) {
                    console.log(`ShanghaiCooperationHistory ID ${row['订单号']} not found. Skipping...`);
                    continue;
                }
                const user = await User.findByPk(history.user_id, { attributes: ['id', 'name', 'phone_number', 'relation'] });
                if (!user) {
                    console.log(`User ID ${history.user_id} not found. Skipping...`);
                    continue;
                }
                const bonuses = await ShanghaiCooperationBonuses.findAll({
                    where: {
                        from_user_id: user.id,
                        package_history_id: history.id,
                    },
                    attributes: ['id', 'user_id', 'amount', 'createdAt'],
                });

                const t = await db.transaction();
                try {
                    for (const bonus of bonuses) {
                        const bonusUser = await User.findByPk(bonus.user_id, { attributes: ['id', 'name', 'relation', 'phone_number', 'balance'] });
                        if (!bonusUser) {
                            console.log(`Bonus User ID ${bonus.user_id} not found. Skipping...`);
                            continue;
                        }
                        if (Number(bonusUser.balance) < Number(bonus.amount)) {
                            bonusNotEnoughtToDelete.push({
                                "订单号": history.id,
                                "户ID": bonusUser.id,
                                "户姓名": bonusUser.name,
                                "户手机号": bonusUser.phone_number,
                                "奖金金额": Number(bonus.amount),
                                "创建时间": bonus.createdAt ? moment(bonus.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                            });
                        } else {
                            await CashFlow.create({
                                relation: bonusUser.relation,
                                user_id: bonusUser.id,
                                wallet_type: 2,
                                model: 'ShanghaiCooperationBonuses',
                                type: `纪念币方案奖金扣除`,
                                amount: -Number(bonus.amount),
                                before_amount: Number(bonusUser.balance),
                                after_amount: Number(bonusUser.balance) - Number(bonus.amount),
                                flow_status: 'OUT',
                                description: `异常订单扣除`,
                            }, { transaction: t });
                            await bonusUser.decrement({ balance: bonus.amount }, { transaction: t });
                            await bonus.destroy({ transaction: t });
                        }
                    }

                    await CashFlow.destroy({
                        where: {
                            user_id: user.id,
                            id: row['异常流水ID'],
                        },
                        transaction: t,
                    });
                    await history.destroy({ transaction: t });
                    await t.commit();
                    console.log(`Deleted ShanghaiCooperationHistory ID ${history.id} and related bonuses for User ID ${user.id}.`);
                } catch (error) {
                    await t.rollback();
                }
            }

            if (bonusNotEnoughtToDelete.length > 0) {
                const worksheet = xlsx.utils.json_to_sheet(bonusNotEnoughtToDelete);
                const workbook1 = xlsx.utils.book_new();
                xlsx.utils.book_append_sheet(workbook1, worksheet, 'Bonus Not Enough');
                xlsx.writeFile(workbook1, 'bonus_not_enough_to_delete_shanghai_cooperation.xlsx');
                console.log(`Exported bonuses not enough to delete to bonus_not_enough_to_delete_shanghai_cooperation.xlsx`);
            }

        } catch (error) {
            errLogger(`[DELETE_SHANGHAI_COOPERATION]: ${error.stack}`);
        }
    }
 
    // NOT CRON
    EXPORT_NEW_CASH_FLOWS = async () => {
        try {
            const rows = await CashFlow.findAll({
                where: {
                    createdAt: {
                        [Op.gt]: '2026-06-25 04:00:00'
                    },
                    type: {
                        [Op.in]: ['黄金增值计划战略储备金返还', '账户转账', '转账']
                    }
                }
            });

            const list = [];
            for (const row of rows) {
                const user = await User.findByPk(row.user_id, { attributes: ['id', 'name', 'phone_number'] });
                list.push({
                    "流水ID": row.id,
                    "用户ID": row.user_id,
                    "姓名": user ? user.name : '',
                    "手机号": user ? user.phone_number : '',
                    "钱包类型": row.wallet_type == 1 ? '储备金' : '余额',
                    "产品类型": row.type,
                    "金额": Number(row.amount),
                    "变动前金额": Number(row.before_amount),
                    "变动后金额": Number(row.after_amount),
                    "流水状态": row.flow_status === 'IN' ? '收入' : '支出',
                    "描述": row.description,
                    "创建时间": row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                });
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'New Cash Flows');
            xlsx.writeFile(workbook1, 'new_cash_flows_export.xlsx');

            console.log(`Export completed. File saved as new_cash_flows_export.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_NEW_CASH_FLOWS]: ${error.stack}`); 
        }
    }

    // NOT CRON
    TO_SUBSTRACT = async () => {
        try {
            const xlsx = require('xlsx');
            const filepath = 'tofix.xlsx';
            const workbook = xlsx.readFile(filepath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);

            for (const row of data) {
                const userId = row['用户ID'];
                if (!userId) {
                    continue;
                }
                const user = await User.findByPk(userId, { attributes: ['id', 'name', 'phone_number', 'relation', 'balance', 'reserve_fund'] });
                if (!user) {
                    console.log(`User ID ${userId} not found. Skipping...`);
                    continue;
                }

                const toSubstractBalance = Number(row['从余额扣除']) || 0;
                const toSubstractReserveFund = Number(row['从储备金扣除']) || 0;
                const cashflowIds = row['发放流水IDs'] ? row['发放流水IDs'].toString().split(',').map(id => Number(id.trim())) : [];
                
                const t = await db.transaction();
                try {
                    await user.decrement({ balance: toSubstractBalance, reserve_fund: toSubstractReserveFund }, { transaction: t });
                    for (const cashflowId of cashflowIds) {
                        const cashflow = await CashFlow.findByPk(cashflowId, { transaction: t });
                        if (cashflow) {
                            await cashflow.destroy({ transaction: t });
                        } else {
                            console.log(`CashFlow ID ${cashflowId} not found. Skipping...`);
                        }
                    }
                    await t.commit();
                    commonLogger(`Processed User ID ${userId}: Subtracted Balance ${toSubstractBalance}, Subtracted Reserve Fund ${toSubstractReserveFund}, Deleted CashFlows [${cashflowIds.join(', ')}]`);
                } catch (error) {
                    await t.rollback();
                    console.log(`Error processing User ID ${userId}: ${error.message}`);
                }
            }
        } catch (error) {
            errLogger(`[TO_SUBSTRACT]: ${error.stack}`);    
        }
    }

    // NOT CRON
    RECALL_GOLD_APPRECIATION_PACKAGE = async () => {
        try {
            const ids = [
                { id: [177787, 177784], substract: 2229.3, phone_number: '15675679368' },
                { id: [177805], substract: 2400, phone_number: '18519236931' },
                { id: [177789], substract: 1115.55, phone_number: '18887250638' },
                { id: [177790], substract: 1600, phone_number: '13838941246' },
                { id: [177780], substract: 881.2, phone_number: '15844855079' },
                { id: [177793], substract: 800, phone_number: '18169216566' },
                { id: [177810], substract: 272.9, phone_number: '13973525583' },
                { id: [177792], substract: 800, phone_number: '18890139525' },
                { id: [177810], substract: 400, phone_number: '13973525583' },
                { id: [177789], substract: 1200, phone_number: '18887250638' },
                { id: [177806], substract: 800, phone_number: '13091309729' },
            ]

            for (const item of ids) {
                const user = await User.findOne({ where: { phone_number: item.phone_number }, attributes: ['id', 'name', 'phone_number', 'relation', 'balance', 'reserve_fund'] });
                if (!user) {
                    console.log(`User with phone number ${item.phone_number} not found. Skipping...`);
                    continue;
                }

                const t = await db.transaction();
                try {
                    const histories = await GoldAppreciationPackageHistory.findAll({
                        where: {
                            id: {
                                [Op.in]: item.id
                            },
                            user_id: user.id
                        },
                        transaction: t
                    });

                    const refund = histories.reduce((sum, history) => sum + Number(history.price), 0);
                    const remainReserveFund = refund - item.substract;
                    await user.increment({ reserve_fund: remainReserveFund }, { transaction: t });  

                    // Bonuses
                    const bonuses = await GoldAppreciationPackageBonuses.findAll({
                        where: {
                            from_user_id: user.id,
                            package_history_id: {
                                [Op.in]: item.id
                            }
                        },
                        transaction: t
                    });

                    for (const bonus of bonuses) {
                        const bonusUser = await User.findByPk(bonus.user_id, { attributes: ['id', 'name', 'relation', 'phone_number', 'balance'], transaction: t });
                        if (!bonusUser) {
                            console.log(`Bonus User ID ${bonus.user_id} not found. Skipping...`);
                            continue;
                        }
                        await bonusUser.decrement({ balance: bonus.amount }, { transaction: t });
                    }
                    
                    await GoldAppreciationPackageHistory.destroy({
                        where: {
                            id: {
                                [Op.in]: item.id
                            },
                            user_id: user.id
                        },
                        transaction: t
                    });

                    await t.commit();
                    console.log(`Recalled Gold Appreciation Package for User ID ${user.id}: Refund ${refund}, Subtracted ${item.substract}, Remaining Reserve Fund ${remainReserveFund}`);
                } catch (error) {
                    await t.rollback();
                    console.log(`Error recalling Gold Appreciation Package for User ID ${user.id}: ${error.message}`);
                }
            }

        } catch (error) {
            errLogger(`[RECALL_GOLD_APPRECIATION_PACKAGE]: ${error.stack}`); 
        }
    }

    // NOT CRON
    EXPORT_BALANCE_TRANSFER = async () => {
        try {
            const records = await BalanceTransfer.findAll({
                include: [
                    {
                        model: User,
                        as: 'from',
                        attributes: ['id', 'name', 'phone_number', 'is_internal_account'],
                    },
                    {
                        model: User,
                        as: 'to',
                        attributes: ['id', 'name', 'phone_number', 'is_internal_account']
                    }
                ],
                attributes: ['id', 'amount', 'createdAt'],
                where: {
                    [Op.or]: [
                        { '$from.is_internal_account$': 1 },
                        { '$to.is_internal_account$': 1 }
                    ]
                },
            });

            const list = [];
            for (const record of records) {
                list.push({
                    "转账ID": record.id,
                    "发送者ID": record.from ? record.from.id : '',
                    "发送者姓名": record.from ? record.from.name : '',
                    "发送者手机号": record.from ? record.from.phone_number : '',
                    "发送者是否内部账户": record.from ? (record.from.is_internal_account ? '是' : '否') : '',
                    "接收者ID": record.to ? record.to.id : '',
                    "接收者姓名": record.to ? record.to.name : '',
                    "接收者手机号": record.to ? record.to.phone_number : '',
                    "接收者是否内部账户": record.to ? (record.to.is_internal_account ? '是' : '否') : '',
                    "转账金额": Number(record.amount),
                    "转账时间": record.createdAt ? moment(record.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                });
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Balance Transfer Records');
            xlsx.writeFile(workbook1, 'balance_transfer_records_export.xlsx');
            console.log(`Export completed. File saved as balance_transfer_records_export.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_BALANCE_TRANSFER]: ${error.stack}`); 
        }
    }

    SUM_GOLD_COUNT_IN_COUPON = async () => {
        try {
            const users = await User.findAll({
                attributes: ['id', 'total_gold_count_in_coupon'],
                order: [['id', 'ASC']]
            });

            for (const user of users) {
                const where = {
                    user_id: user.id,
                    is_moved_to_total_gold_count: 0,
                    is_used: 0,
                    reward_id: 7,
                    validedAt: {
                        [Op.between]: ['2026-01-10 04:00:00', '2026-07-12 00:00:00']
                    }
                };
                const totalGoldCount = await RewardRecord.sum('amount', { where });
                if (totalGoldCount > 0) {
                    const t = await db.transaction();
                    try {
                        const totalGoldInCoupon = Number(user.total_gold_count_in_coupon) + Number(totalGoldCount);
                        await User.update(
                            { total_gold_count_in_coupon: totalGoldInCoupon },
                            { where: { id: user.id }, transaction: t }
                        );
                        await RewardRecord.update(
                            { is_moved_to_total_gold_count: 1 },
                            { where, transaction: t }
                        );
                        await t.commit();
                        console.log(`[SUM_GOLD_COUNT_IN_COUPON][USER_ID: ${user.id}]: Moved ${totalGoldCount} to total_gold_count_in_coupon`);
                    } catch (error) {
                        await t.rollback();
                        errLogger(`[SUM_GOLD_COUNT_IN_COUPON][USER_ID: ${user.id}]: ${error.stack}`);
                    }
                }
            }
        } catch (error) {
            errLogger(`[SUM_GOLD_COUNT_IN_COUPON]: ${error.stack}`);
        }
    }

    SUM_GOLD_COUNT_IN_LETTER = async () => {
        try {
            const users = await User.findAll({
                attributes: ['id', 'total_gold_count_in_letter'],
                order: [['id', 'ASC']]
            });
            for (const user of users) {
                const where = {
                    gold_owner_id: user.id,
                    is_used: 0,
                    is_moved_to_total_gold_count: 0,
                    createdAt: {
                        [Op.between]: ['2026-01-10 04:00:00', '2026-07-12 00:00:00']
                    }
                };
                const totalGoldCount = await AuthorizeLetterHistory.sum('gold_count', { where: where });
                if (totalGoldCount > 0) {
                    const t = await db.transaction();
                    try {
                        const totalGoldInLetter = Number(user.total_gold_count_in_letter) + Number(totalGoldCount);
                        await User.update(
                            { total_gold_count_in_letter: totalGoldInLetter },
                            { where: { id: user.id }, transaction: t }
                        );
                        await AuthorizeLetterHistory.update(
                            { is_moved_to_total_gold_count: 1 },
                            { where: where, transaction: t }
                        );
                        await t.commit();
                        console.log(`[SUM_GOLD_COUNT_IN_LETTER][USER_ID: ${user.id}]: Moved ${totalGoldCount} to total_gold_count_in_letter`);
                    } catch (error) {
                        await t.rollback();
                        errLogger(`[SUM_GOLD_COUNT_IN_LETTER][USER_ID: ${user.id}]: ${error.stack}`);
                    }
                }
            }
        } catch (error) {
            errLogger(`[SUM_GOLD_COUNT_IN_LETTER]: ${error.stack}`);
        }
    }

    CHECK_VALIDED_COUPON = async () => {
        try {
            const records = await RewardRecord.findAll({
                where: {
                    reward_id: 7,
                    is_used: 0,
                    validedAt: {
                        [Op.lt]: new Date()
                    },
                    is_moved_to_total_gold_count: 0
                },
                attributes: ['id', 'user_id', 'amount']
            });

            for (const record of records) {
                const t = await db.transaction();
                try {
                    await User.increment(
                        { total_gold_count_in_coupon: record.amount },
                        { where: { id: record.user_id }, transaction: t }
                    );
                    await RewardRecord.update(
                        { is_moved_to_total_gold_count: 1 },
                        { where: { id: record.id }, transaction: t }
                    );
                    await t.commit();
                    console.log(`[CHECK_VALIDED_COUPON][REWARD_RECORD_ID: ${record.id}]: Moved ${record.amount} to total_gold_count_in_coupon for User ID ${record.user_id}`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[CHECK_VALIDED_COUPON][REWARD_RECORD_ID: ${record.id}]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[CHECK_VALIDED_COUPON]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_TODAY_CASH_FLOWS = async () => {
        try {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();

            const cashFlows = await CashFlow.findAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone_number']
                },
                where: {
                    createdAt: {
                        [Op.between]: [todayStart, todayEnd]
                    }
                },
                attributes: ['id', 'wallet_type', 'type', 'amount', 'before_amount', 'after_amount', 'flow_status', 'description', 'createdAt'],
            });

            const list = cashFlows.map(flow => ({
                "流水ID": flow.id,
                "用户ID": flow.user ? flow.user.id : '',
                "姓名": flow.user ? flow.user.name : '',
                "手机号": flow.user ? flow.user.phone_number : '',
                "钱包类型": flow.wallet_type == 1 ? '储备金' : '余额',
                "类型": flow.type,
                "金额": Number(flow.amount),
                "变动前金额": Number(flow.before_amount),
                "变动后金额": Number(flow.after_amount),
                "流水状态": flow.flow_status === 'IN' ? '收入' : '支出',
                "描述": flow.description,
                "创建时间": flow.createdAt ? moment(flow.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
            }));

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Today Cash Flows');
            xlsx.writeFile(workbook1, 'today_cash_flows_export.xlsx');

        } catch (error) {
            errLogger(`[EXPORT_TODAY_CASH_FLOWS]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_TODAY_DUPLICATE_WITHDRAWALS = async () => {
        try {
            const todayStart = moment().startOf('day').toDate();
            const todayEnd = moment().endOf('day').toDate();

            const rows = await Withdraw.findAll({
                attributes: [
                    'user_id',
                    [fn('COUNT', col('*')), 'withdraw_count'],
                ],
                where: {
                    createdAt: {
                        [Op.between]: [todayStart, todayEnd]
                    }
                },
                group: ['user_id'],
                having: literal('COUNT(*) > 1'),
                raw: true,
            });

            const list = [];
            for (const row of rows) {
                const withdraws = await Withdraw.findAll({
                    include: {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number']
                    },
                    where: {
                        user_id: row.user_id,
                        createdAt: {
                            [Op.between]: [todayStart, todayEnd]
                        }
                    },
                    order: [['createdAt', 'ASC']],
                    attributes: ['id', 'order_no', 'amount', 'handle_fee', 'before_amount', 'after_amount', 'status', 'createdAt'],
                });
                for (const withdraw of withdraws) {
                    list.push({
                        "用户ID": withdraw.user ? withdraw.user.id : '',
                        "姓名": withdraw.user ? withdraw.user.name : '',
                        "手机号": withdraw.user ? withdraw.user.phone_number : '',
                        "提现ID": withdraw.id,
                        "订单号": withdraw.order_no,
                        "提现金额": Number(withdraw.amount),
                        "手续费": Number(withdraw.handle_fee),
                        "提现前金额": Number(withdraw.before_amount),
                        "提现后金额": Number(withdraw.after_amount),
                        "提现状态": withdraw.status === 0 ? '待处理' : withdraw.status === 1 ? '已完成' : '已拒绝',
                        "创建时间": withdraw.createdAt ? moment(withdraw.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                    });
                }
            }
            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Today Duplicate Withdrawals');
            xlsx.writeFile(workbook1, 'today_duplicate_withdrawals_export.xlsx');

        } catch (error) {
            errLogger(`[EXPORT_TODAY_DUPLICATE_WITHDRAWALS]: ${error.stack}`);
        }
    }

    // NOT CRON
    GIVE_GOLD_APPR_EARN = async () => {
        try {
            const rows = await GoldAppreciationPackageHistory.findAll({
                include: {
                    model: GoldAppreciationPackage,
                    as: 'package',
                    attributes: ['id', 'gold_appreciation_earn', 'reserve_earn'],
                },
                where: {
                    is_returned_earn: 0,
                    description: '新注册用户福利',
                    createdAt: {
                        [Op.gte]: '2026-07-15 04:30:00'
                    }
                },
            });
            const goldPrice = await GoldPrice.findOne({
                order: [['createdAt', 'DESC']],
            });

            for (const row of rows) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(row.user_id, { attributes: ['id', 'relation', 'balance'] });
                    if (!user) {
                        console.log(`User ID ${row.user_id} not found. Skipping...`);
                        continue;
                    }
                    const gPackage = row.package;
                    const goldGram = Number(gPackage.gold_appreciation_earn) / Number(goldPrice.reserve_price);
                    const earns = [
                        {
                            user_id: user.id,
                            relation: user.relation,
                            package_id: gPackage.id,
                            package_history_id: row.id,
                            amount: gPackage.gold_appreciation_earn,
                            type: 0, // 0-黄金增值金
                            description: `转换${goldGram.toFixed(4)}克黄金`,
                        },
                        {
                            user_id: user.id,
                            relation: user.relation,
                            package_id: gPackage.id,
                            package_history_id: row.id,
                            amount: gPackage.reserve_earn,
                            type: 1, // 1-战略储备金
                        },
                    ];
    
                    const earnCashflows = [
                        {
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 2,
                            model: 'GoldAppreciationPackageEarn',
                            type: '黄金增值金返还',
                            amount: gPackage.gold_appreciation_earn,
                            before_amount: user.balance,
                            after_amount: Number(user.balance) + Number(gPackage.gold_appreciation_earn),
                            flow_status: 'IN',
                        },
                        {
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 2,
                            model: 'GoldAppreciationPackageEarn',
                            type: '黄金增值计划战略储备金返还',
                            amount: gPackage.reserve_earn,
                            before_amount: Number(user.balance) + Number(gPackage.gold_appreciation_earn),
                            after_amount: Number(user.balance) + Number(gPackage.gold_appreciation_earn) + Number(gPackage.reserve_earn),
                            flow_status: 'IN',
                            description: `黄金增值计划战略储备金返还${gPackage.reserve_earn}`,
                        }
                    ];
                    await GoldAppreciationPackageEarn.bulkCreate(earns, { transaction: t });
                    await CashFlow.bulkCreate(earnCashflows, { transaction: t });

                    await user.increment({ 
                        balance: Number(gPackage.gold_appreciation_earn) + Number(gPackage.reserve_earn),
                        total_gold_count_in_letter: -goldGram
                    }, { transaction: t });
                    await row.update({ 
                        is_returned_earn: 1,
                        return_earn_date: new Date(),
                        gold_appreciation_earn_count_remain: 179
                    }, { transaction: t });
                    await t.commit();
                    console.log(`[GIVE_GOLD_APPR_EARN][HISTORY_ID: ${row.id}]: Returned earn to User ID ${user.id}`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[GIVE_GOLD_APPR_EARN][HISTORY_ID: ${row.id}]: ${error.stack}`);
                }
            }

        } catch (error) {
            errLogger(`[GIVE_GOLD_APPR_EARN]: ${error.stack}`);
        }
    }

    // NOT CRON
    RETURN_GOLD_PACKAGE_RATE = async () => {
        try {
            const rows = await GoldPackageHistory.findAll({
                attributes: ['id', 'user_id', 'return_rate', 'price', 'package_id'],
                where: {
                    is_returned_rate: 0,
                }
            });

            const isAssetActive = await this.is_asset_treasure_active();
            const walletType = isAssetActive ? 3 : 2; // 3-资产宝, 2-余额
            const walletColumn = isAssetActive ? 'total_assets' : 'balance';

            for (const row of rows) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(row.user_id, { attributes: ['id', 'relation', 'balance', 'total_assets'] });
                    if (!user) {
                        console.log(`User ID ${row.user_id} not found. Skipping...`);
                        continue;
                    }
                    const rate = Number(row.return_rate.split('-')[1]); // 4826-5324
                    await GoldPackageReturn.create({
                        user_id: user.id,
                        relation: user.relation,
                        package_id: row.package_id,
                        package_history_id: row.id,
                        amount: rate,
                        description: `和衷储备收益`,
                    }, { transaction: t });
                    await CashFlow.create({
                        relation: user.relation,
                        user_id: user.id,
                        wallet_type: walletType,
                        model: 'GoldPackageHistory',
                        type: '和衷储备收益',
                        amount: rate,
                        before_amount: user[walletColumn],
                        after_amount: Number(user[walletColumn]) + rate,
                        flow_status: 'IN',
                    }, { transaction: t });

                    let incrementFields = { [walletColumn]: rate };
                    if (isAssetActive) {
                        incrementFields.total_assets_earn = rate;
                    }
                    await user.increment(incrementFields, { transaction: t });
                    await row.update({ is_returned_rate: 1 }, { transaction: t });
                    await t.commit();
                    console.log(`[RETURN_GOLD_PACKAGE_RATE][HISTORY_ID: ${row.id}]: Returned rate to User ID ${user.id}`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[RETURN_GOLD_PACKAGE_RATE][HISTORY_ID: ${row.id}]: ${error.stack}`);
                }
            }

            console.log(`[RETURN_GOLD_PACKAGE_RATE]: Processed ${rows.length} records.`);
        } catch (error) {
            errLogger(`[RETURN_GOLD_PACKAGE_RATE]: ${error.stack}`);
        }
    }

    CALCULATE_ASSET_EARN = async () => {
        try {
            const users = await User.findAll({
                where: {
                    total_assets: {
                        [Op.gt]: 0
                    }
                },
                attributes: ['id', 'relation', 'total_assets', 'total_assets_earn', 'daily_product_earn'],
            });

            for (const user of users) {
                const t = await db.transaction();
                try {
                    const dailyEarn = Number(user.total_assets) * 0.0518 / 365; // 5.18% annualized rate
                    const newTotalAssets = Number(user.total_assets) + dailyEarn;
                    const newTotalAssetsEarn = Number(user.total_assets_earn) + dailyEarn;

                    await AssetEarnHistory.create({
                        user_id: user.id,
                        relation: user.relation,
                        total_assets: Number(user.total_assets),
                        total_product_earn: Number(user.daily_product_earn),
                        daily_earn: dailyEarn,
                    }, { transaction: t });

                    await user.update({
                        total_assets: newTotalAssets,
                        total_assets_earn: newTotalAssetsEarn,
                        daily_product_earn: 0,
                    }, { transaction: t });

                    await t.commit();
                    console.log(`[CALCULATE_ASSET_EARN][USER_ID: ${user.id}]: Daily earn calculated and updated.`);

                } catch (error) {
                    await t.rollback();
                    errLogger(`[CALCULATE_ASSET_EARN][USER_ID: ${user.id}]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[CALCULATE_ASSET_EARN]: ${error.stack}`);
        }
    }

    RELEASE_ASSET_FUND = async () => {
        try {
            const histories = await AssetDistributionPackageHistory.findAll({
                where: {
                    is_returned_fund: 0,
                    return_date: {
                        [Op.lte]: moment().format('YYYY-MM-DD')
                    }
                },
            });

            for (const history of histories) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(history.user_id, { attributes: ['id', 'relation', 'balance', 'total_assets'] });
                    if (!user) {
                        console.log(`User ID ${history.user_id} not found. Skipping...`);
                        await t.rollback();
                        continue;
                    }

                    await AssetDistributionPackageEarn.create({
                        user_id: user.id,
                        relation: user.relation,
                        package_id: history.package_id,
                        package_history_id: history.id,
                        amount: history.asset_fund,
                    }, { transaction: t });

                    const cashflows = [
                        {
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 2, // 2-余额
                            model: 'AssetDistributionPackageEarn',
                            type: '资产宝发放收益',
                            amount: history.asset_fund,
                            before_amount: user.balance,
                            after_amount: Number(user.balance) + Number(history.asset_fund),
                            flow_status: 'IN',
                        },
                        {
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 3, // 2-资产宝
                            model: 'AssetDistributionPackageEarn',
                            type: '资产宝发放收益',
                            amount: history.asset_fund,
                            before_amount: user.total_assets,
                            after_amount: Number(user.total_assets) - Number(history.asset_fund),
                            flow_status: 'OUT',
                        },
                    ]

                    await CashFlow.bulkCreate(cashflows, { transaction: t });
                    await user.increment({ balance: Number(history.asset_fund), total_assets: -Number(history.asset_fund) }, { transaction: t });
                    await history.update({ is_returned_fund: 1, return_fund_date: new Date() }, { transaction: t });

                    await t.commit();
                    console.log(`[RELEASE_ASSET_FUND][HISTORY_ID: ${history.id}]: Released asset fund to User ID ${user.id}`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[RELEASE_ASSET_FUND][HISTORY_ID: ${history.id}]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[RELEASE_ASSET_FUND]: ${error.stack}`);
        }
    }

    RELEASE_ASSET_EARN = async () => {
        try {
            const today = moment().format('YYYY-MM-DD');
            const rows = await AssetEarnPackageHistory.findAll({
                where: {
                    is_finished: 0,
                    createdAt: {
                        [Op.lte]: today
                    }
                },
                attributes: ['id', 'user_id', 'period', 'package_id', 'daily_earn'],
            });
            
            for (const row of rows) {
                const t = await db.transaction();
                try {
                    const user = await User.findByPk(row.user_id, { attributes: ['id', 'relation', 'total_assets'] });
                    if (!user) {
                        console.log(`User ID ${row.user_id} not found. Skipping...`);
                        await t.rollback();
                        continue;
                    }

                    const earnCount = await AssetEarnPackageEarn.count({
                        where: {
                            user_id: row.user_id,
                            package_history_id: row.id
                        },
                        transaction: t
                    });

                    if (earnCount >= row.period - 1) {
                        await row.update({ is_finished: 1 }, { transaction: t });
                    }

                    await AssetEarnPackageEarn.create({
                        user_id: user.id,
                        relation: user.relation,
                        package_id: row.package_id,
                        package_history_id: row.id,
                        amount: row.daily_earn,
                    }, { transaction: t });

                    await CashFlow.create({
                        user_id: user.id,
                        relation: user.relation,
                        wallet_type: 3, // 3-资产宝
                        model: 'AssetEarnPackageEarn',
                        type: '资产宝收益',
                        amount: row.daily_earn,
                        before_amount: user.total_assets,
                        after_amount: Number(user.total_assets) + Number(row.daily_earn),
                        flow_status: 'IN',
                        description: '每日收益',
                    }, { transaction: t });

                    await user.increment({ total_assets: Number(row.daily_earn) }, { transaction: t });

                    await t.commit();

                    commonLogger(`[RELEASE_ASSET_EARN][HISTORY_ID: ${row.id}]: Released asset earn - ${Number(row.daily_earn)} to User ID ${user.id}`);

                } catch (error) {
                    await t.rollback();
                    errLogger(`[RELEASE_ASSET_EARN][HISTORY_ID: ${row.id}]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[RELEASE_ASSET_EARN]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_GOLD_APPRECIATION_PACKAGE_HISTORY = async () => {
        try {
            const histories = await GoldAppreciationPackageHistory.findAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone_number']
                },
                where: {
                    is_returned_price: 1,
                    price: {
                        [Op.in]: [600, 1200]
                    },
                    return_price_date: {
                        [Op.between]: ['2026-06-15 00:30:00', '2026-06-15 23:59:59']
                    }
                },
                order: [['user_id', 'ASC']],
            });

            const list = [];
            let totalPrice = 0;
            for (const history of histories) {
                // check cashflow exists
                const cashflow = await CashFlow.findOne({
                    where: {
                        user_id: history.user_id,
                        model: 'GoldAppreciationPackageEarn',
                        type: '黄金增值计划本金返还',
                        amount: history.price,
                    },
                    attributes: ['id'],
                });
                if (!cashflow) {
                    list.push({
                        "用户ID": history.user ? history.user.id : '',
                        "姓名": history.user ? history.user.name : '',
                        "手机号": history.user ? history.user.phone_number : '',
                        "记录ID": history.id,
                        "本金": Number(history.price),
                        "创建时间": history.createdAt ? moment(history.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                        "返还时间": history.return_price_date ? moment(history.return_price_date).format('YYYY-MM-DD HH:mm:ss') : '',
                    });
                    totalPrice += Number(history.price);
                    console.log(`[EXPORT_GOLD_APPRECIATION_PACKAGE_HISTORY]: Missing cashflow for User ID ${history.user_id}, History ID ${history.id}, Price ${history.price}`);
                }
            }

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Fixes');
            xlsx.writeFile(workbook1, `${histories.length}条_${totalPrice}金额.xlsx`);
        } catch (error) {
            errLogger(`[EXPORT_GOLD_APPRECIATION_PACKAGE_HISTORY]: ${error.stack}`);
        }
    }

    // NOT CRON
    REFUND_ORIGINAL_PRICE = async () => {
        try {
            // read from file
            const xlsx = require('xlsx');
            const workbook = xlsx.readFile('22030条_16704600金额.xlsx');
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(worksheet);

            for (const row of data) {
                const historyId = row['记录ID'];
                const userId = row['用户ID'];

                const user = await User.findByPk(userId, { attributes: ['id', 'relation', 'balance'] });
                if (!user) {
                    console.log(`User ID ${userId} not found. Skipping...`);
                    continue;
                }
                const pack = await GoldAppreciationPackageHistory.findByPk(historyId);
                if (!pack) {
                    console.log(`History ID ${historyId} not found. Skipping...`);
                    continue;
                }

                console.log(`[REFUND_ORIGINAL_PRICE][HISTORY_ID: ${historyId}]: Refunding original price to User ID ${user.id}, Amount: ${pack.price}`);

                const t = await db.transaction();
                try {
                    await GoldAppreciationPackageEarn.create({
                        user_id: pack.user_id,
                        relation: user.relation,
                        package_id: pack.package_id,
                        package_history_id: pack.id,
                        amount: Number(pack.price),
                        type: 2, // 2-本金返还
                    }, { transaction: t });

                    await CashFlow.create({
                        user_id: pack.user_id,
                        relation: user.relation,
                        wallet_type: 2,
                        model: 'GoldAppreciationPackageEarn',
                        type: '黄金增值计划本金返还',
                        amount: Number(pack.price),
                        before_amount: user.balance,
                        after_amount: Number(user.balance) + Number(pack.price),
                        flow_status: 'IN',
                        description: `黄金增值计划本金返还${pack.price}`,
                    }, { transaction: t });

                    await user.increment({ balance: Number(pack.price) }, { transaction: t });

                    await t.commit();
                    console.log(`[REFUND_ORIGINAL_PRICE][HISTORY_ID: ${historyId}]: Refunded original price to User ID ${user.id}`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[REFUND_ORIGINAL_PRICE][HISTORY_ID: ${historyId}]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[REFUND_ORIGINAL_PRICE]: ${error.stack}`);
        }
    }

    // NOT CRON
    REFUND_SHANGHAI_MASONIC_FUND = async () => {
        try {
            const packages = await ShanghaiCooperationHistory.findAll({
                where: {
                    is_returned_masonic_fund: 1,
                },
                attributes: ['id', 'user_id', 'masonic_fund'],
            });
            for (const pack of packages) {
                await User.increment({ masonic_fund: Number(pack.masonic_fund) }, { where: { id: pack.user_id } });
                commonLogger(`[REFUND_SHANGHAI_MASONIC_FUND][HISTORY_ID: ${pack.id}]: Refunded masonic fund to User ID ${pack.user_id}, Amount: ${pack.masonic_fund}`);
            }
        } catch (error) {
            errLogger(`[REFUND_SHANGHAI_MASONIC_FUND]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_WITHDRAW = async () => {
        try {
            const rows = await Withdraw.findAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone_number'],
                    include: {
                        model: PaymentMethod,
                        as: 'payment_method',
                        attributes: ['id', 'bank_card_number', 'bank_card_name', 'open_bank_name', 'ali_account_number', 'ali_account_name', 'fenxiang_account_name', 'fenxiang_account_number'],
                    }
                },
                where: {
                    createdAt: {
                        [Op.between]: ['2026-07-15 00:00:00', '2026-07-19 23:59:59']
                    },
                    amount: {
                        [Op.lte]: 500
                    },
                },
                attributes: ['id', 'order_no', 'amount', 'handle_fee', 'before_amount', 'after_amount', 'createdAt'],
                order: [['createdAt', 'ASC']],
            });

            const list = rows.map(row => ({
                "用户ID": row.user ? row.user.id : '',
                "姓名": row.user ? row.user.name : '',
                "手机号": row.user ? row.user.phone_number : '',
                "提现ID": row.id,
                "订单号": row.order_no,
                "提现金额": Number(row.amount),
                "手续费": Number(row.handle_fee),
                "到账金额": Number(row.amount) - Number(row.handle_fee),
                "提现状态": row.status === 0 ? '待处理' : row.status === 1 ? '已完成' : '已拒绝',
                "提现前金额": Number(row.before_amount),
                "提现后金额": Number(row.after_amount),
                "创建时间": row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss') : '',
                "银行账户": row.user && row.user.payment_method ? row.user.payment_method.bank_card_number : '',
                "银行账户姓名": row.user && row.user.payment_method ? row.user.payment_method.bank_card_name : '',
                "开户行": row.user && row.user.payment_method ? row.user.payment_method.open_bank_name : '',
                "支付宝账户": row.user && row.user.payment_method ? row.user.payment_method.ali_account_number : '',
                "支付宝账户姓名": row.user && row.user.payment_method ? row.user.payment_method.ali_account_name : '',
                "纷享生活账户": row.user && row.user.payment_method ? row.user.payment_method.fenxiang_account_number : '',
                "纷享生活账户姓名": row.user && row.user.payment_method ? row.user.payment_method.fenxiang_account_name : '',
            }));

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Withdrawals Export');
            xlsx.writeFile(workbook1, 'withdrawals_export.xlsx');
        } catch (error) {
            errLogger(`[EXPORT_WITHDRAW]: ${error.stack}`);
        }
    }

    // NOT CRON
    RELEASE_REFERRAL_BONUS = async () => {
        try {
            const users = await User.findAll({
                where: {
                    referral_bonus: {
                        [Op.gt]: 0
                    }
                },
                attributes: ['id', 'relation', 'referral_bonus', 'balance'],
            });

            for (const user of users) {
                const t = await db.transaction();
                try {
                    const bonus = Number(user.referral_bonus);
                    await CashFlow.create({
                        user_id: user.id,
                        relation: user.relation,
                        wallet_type: 2, // 2-余额
                        model: 'User',
                        type: '推荐奖励发放',
                        amount: bonus,
                        before_amount: user.balance,
                        after_amount: Number(user.balance) + bonus,
                        flow_status: 'IN',
                    }, { transaction: t });
                    await user.update({ 
                        balance: Number(user.balance) + bonus, 
                        referral_bonus: 0 
                    }, { transaction: t });

                    await t.commit();
                    console.log(`[RELEASE_REFERRAL_BONUS][USER_ID: ${user.id}]: Released referral bonus of ${bonus}`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[RELEASE_REFERRAL_BONUS][USER_ID: ${user.id}]: ${error.stack}`);
                }
            }
            console.log(`[RELEASE_REFERRAL_BONUS]: Processed ${users.length} users.`);
        } catch (error) {
            errLogger(`[RELEASE_REFERRAL_BONUS]: ${error.stack}`);
        }
    }

    // NOT CRON
    EXPORT_USER_BALANCE_GT_0 = async () => {
        try {
            const users = await User.findAll({
                where: {
                    balance: {
                        [Op.gt]: 0
                    }
                },
                attributes: ['id', 'name', 'phone_number', 'balance'],
            });

            const list = users.map(user => ({
                "用户ID": user.id,
                "姓名": user.name,
                "手机号": user.phone_number,
                "余额": Number(user.balance),
            }));

            const xlsx = require('xlsx');
            const worksheet = xlsx.utils.json_to_sheet(list);
            const workbook1 = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook1, worksheet, 'Users with Balance > 0');
            xlsx.writeFile(workbook1, 'users_balance_gt_0.xlsx');
        } catch (error) {
            errLogger(`[EXPORT_USER_BALANCE_GT_0]: ${error.stack}`);
        }
    }

    // NOT CRON
    GIVE_ASSET_TO_USERS = async () => {
        try {
           const phoneNumbers = ["13563430587","18871369122","15166991487","15865916113","17553411249","15253445844","15266960091","13953406369","18266171101","15206903912"];

            for (const phone of phoneNumbers) {
                const user = await User.findOne({ where: { phone_number: phone }, attributes: ['id', 'relation', 'total_assets'] });
                if (!user) {
                    console.log(`User with phone number ${phone} not found. Skipping...`);
                    continue;
                }
                const t = await db.transaction();
                try {
                    await CashFlow.create({
                        user_id: user.id,
                        relation: user.relation,
                        wallet_type: 3, // 资产宝
                        model: 'User',
                        type: '赠送资产宝资产',
                        amount: 30000,
                        before_amount: Number(user.total_assets),
                        after_amount: Number(user.total_assets) + 30000,
                        description: '可进行分发提现',
                        flow_status: 'IN',
                    }, { transaction: t });

                    await user.increment({ total_assets: 30000 }, { transaction: t });
                    await t.commit();

                    console.log(`[GIVE_ASSET_TO_USERS]: Gave 30000 assets to User ID ${user.id} (Phone: ${phone})`);
                } catch (error) {
                    await t.rollback();
                    errLogger(`[GIVE_ASSET_TO_USERS]: ${error.stack}`);
                }
            }
        } catch (error) {
            errLogger(`[GIVE_ASSET_TO_USERS]: ${error.stack}`);
        }
    }
}

module.exports = CronJob;