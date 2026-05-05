const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Deposit, Withdraw, User, UserKYC, PaymentMethod, RewardRecord, db, FederalReserveGoldPackageHistory, GoldPackageHistory, MasonicPackageHistory } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
    }

    DASHBOARD_SUMMARY = async (req, res) => {
        try {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);

            const userId = req.user_id;

            const relationCondtion = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                relationCondtion.relation = { [Op.like]: `${me.relation}/%` }
            }

            const todayCondition = {
                createdAt: {
                    [Op.between]: [startOfToday, endOfToday]
                },
                ...relationCondtion
            };

            const todayDepositAmount = await Deposit.sum('amount', { where: { status: 1, ...todayCondition } });
            const todayDepositCount = await Deposit.count({ where: { status: 1, ...todayCondition } });
            const todayWithdrawAmount = await Withdraw.sum('amount', { where: { status: 1, ...todayCondition } });
            const todayWithdrawCount = await Withdraw.count({ where: { status: 1, ...todayCondition } });
            const todayWithdawAllStatusAmount = await Withdraw.sum('amount', { where: { ...todayCondition } });
            const todayWithdawAllStatusCount = await Withdraw.count({ where: { ...todayCondition } });

            const totalUser = await User.count({ where: { type: 2, ...relationCondtion } });
            const todayRegister = await User.count({
                where: {
                    type: 2,
                    createdAt: {
                        [Op.between]: [startOfToday, endOfToday]
                    },
                    ...relationCondtion
                }
            });
            const kycPendingCount = await UserKYC.count({ where: { status: 'PENDING',  ...relationCondtion } });
            const paymentPendingCount = await PaymentMethod.count({ where: { bank_status: 'PENDING',  ...relationCondtion } });

            const kycApprovedCount = await UserKYC.count({ where: { status: 'APPROVED',  ...relationCondtion } });
            // const yesterdayCheckIn = await RewardRecord.count({
            //     distinct: true,
            //     col: 'user_id',
            //     where: {
            //         createdAt: {
            //             [Op.gte]: yesterdayStart,
            //             [Op.lt]: startOfToday
            //         }
            //     }
            // });
            const totalRefferalBonus = await User.sum('referral_bonus');
            // const totalMasonicFundRelease = await RewardRecord.sum('amount', { where: { reward_id: 1 } })

            const boughtLetterCount = await User.count({
                where: {
                    have_reward_6: 1,
                    reward_6_from_where: 2
                }
            });

            const agreementCount = await User.count({
                where: {
                    agreement_status: 'APPROVED'
                }
            });

            const normalUserReserveFund = await User.sum('reserve_fund', { where: { type: 2, is_internal_account: 0 } });
            const internalUserReserveFund = await User.sum('reserve_fund', { where: { type: 2, is_internal_account: 1 } });
            const normalUserBalance = await User.sum('balance', { where: { type: 2, is_internal_account: 0 } });
            const internalUserBalance = await User.sum('balance', { where: { type: 2, is_internal_account: 1 } });

            const data = {
                today_deposit_amount: todayDepositAmount ? Number(todayDepositAmount) : 0,
                today_deposit_count: todayDepositCount ?? 0,
                today_withdraw_amount: todayWithdrawAmount ? Number(todayWithdrawAmount) : 0,
                today_withdraw_count: todayWithdrawCount ?? 0,
                today_withdraw_all_status_amount: todayWithdawAllStatusAmount ? Number(todayWithdawAllStatusAmount) : 0,
                today_withdraw_all_status_count: todayWithdawAllStatusCount ?? 0,
                total_user: totalUser ?? 0,
                today_register: todayRegister ?? 0,
                kyc_pending_count: kycPendingCount ?? 0,
                payment_pending_count: paymentPendingCount ?? 0,
                kyc_approved_count: kycApprovedCount ?? 0,
                yesterday_check_in: 0,
                total_refferal_bonus: totalRefferalBonus ? Number(totalRefferalBonus) : 0,
                total_masonic_fund_release: 0,
                bought_letter_count: boughtLetterCount,
                agreement_count: agreementCount,
                normal_user_reserve_fund: normalUserReserveFund ? Number(normalUserReserveFund) : 0,
                internal_user_reserve_fund: internalUserReserveFund ? Number(internalUserReserveFund) : 0,
                normal_user_balance: normalUserBalance ? Number(normalUserBalance) : 0,
                internal_user_balance: internalUserBalance ? Number(internalUserBalance) : 0
            };

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHECKIN_SUMMARY = async (req, res) => {
        try {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);
            
            const yesterdayCheckIn = await RewardRecord.count({
                distinct: true,
                col: 'user_id',
                where: {
                    createdAt: {
                        [Op.gte]: yesterdayStart,
                        [Op.lt]: startOfToday
                    }
                }
            });

            const todayCheckIn = await RewardRecord.count({
                distinct: true,
                col: 'user_id',
                where: {
                    createdAt: {
                        [Op.gte]: startOfToday,
                        [Op.lt]: endOfToday
                    }
                }
            });

            const data = {
                yesterday_check_in: yesterdayCheckIn || 0,
                today_check_in: todayCheckIn || 0
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    MASONIC_FUND_SUMMARY = async (req, res) => {
        try {
            const totalMasonicFundRelease = await RewardRecord.sum('amount', { where: { reward_id: 1 } })
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { total_masonic_fund_release: totalMasonicFundRelease || 0 });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    WITHDRAW_SUMMARY = async (req, res) => {
        try {

            const yesterdayCreatedAtCondition = {
                [Op.between]: [
                    moment().subtract(1, 'days').startOf('day').toDate(),
                    moment().subtract(1, 'days').endOf('day').toDate()
                ]
            };

            const todayCreatedAtCondition = {
                [Op.between]: [
                    moment().startOf('day').toDate(),
                    moment().endOf('day').toDate()
                ]
            };

            const yesterdayWithdrawAmount = await Withdraw.sum('amount', {
                where: {
                    status: {
                        [Op.ne]: 2
                    },
                    createdAt: yesterdayCreatedAtCondition
                }
            });

            const yesterdayWitdrawFee = await Withdraw.sum('handle_fee', {
                where: {
                    status: {
                        [Op.ne]: 2
                    },
                    createdAt: yesterdayCreatedAtCondition
                }
            });

            const yesterdayWithdrawActualAmount = await Withdraw.sum('amount', {
                where: {
                    status: 1,
                    createdAt: yesterdayCreatedAtCondition
                }
            });

            const todayWithdrawAmount = await Withdraw.sum('amount', {
                where: {
                    status: {
                        [Op.ne]: 2
                    },
                    createdAt: todayCreatedAtCondition
                }
            });

            const todayWitdrawFee = await Withdraw.sum('handle_fee', {
                where: {
                    status: {
                        [Op.ne]: 2
                    },
                    createdAt: todayCreatedAtCondition
                }
            });

            const todayWithdrawActualAmount = await Withdraw.sum('amount', {
                where: {
                    status: 1,
                    createdAt: todayCreatedAtCondition
                }
            });

            const data = {
                yesterday_withdraw_amount: yesterdayWithdrawAmount ? Number(yesterdayWithdrawAmount) : 0,
                yesterday_withdraw_fee: yesterdayWitdrawFee ? Number(yesterdayWitdrawFee) : 0,
                yesterday_withdraw_actual_amount: yesterdayWithdrawActualAmount ? Number(yesterdayWithdrawActualAmount) : 0,
                today_withdraw_amount: todayWithdrawAmount ? Number(todayWithdrawAmount) : 0,
                today_withdraw_fee: todayWitdrawFee ? Number(todayWitdrawFee) : 0,
                today_withdraw_actual_amount: todayWithdrawActualAmount ? Number(todayWithdrawActualAmount) : 0
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {}); 
        }
    }

    TODAY_ACTIVE_USER_COUNT_ = async (req, res) => {
        try {
            const startDate = moment.utc().startOf("day").toDate();
            const endDate = moment.utc().add(1, "day").startOf("day").toDate();

            const todayActiveFederal = await FederalReserveGoldPackageHistory.findAll({
                where: { createdAt: { [Op.between]: [startDate, endDate] } },
                attributes: ["user_id"],
                raw: true,
            });

            const todayActiveGold = await GoldPackageHistory.findAll({
                where: { createdAt: { [Op.between]: [startDate, endDate] } },
                attributes: ["user_id"],
                raw: true,
            });

            const todayActiveMasonic = await MasonicPackageHistory.findAll({
                where: { createdAt: { [Op.between]: [startDate, endDate] } },
                attributes: ["user_id"],
                raw: true,
            });

            // Unique today active users across 3 tables
            const todayActiveUserSet = new Set();
            todayActiveFederal.forEach((r) => r.user_id != null && todayActiveUserSet.add(r.user_id));
            todayActiveGold.forEach((r) => r.user_id != null && todayActiveUserSet.add(r.user_id));
            todayActiveMasonic.forEach((r) => r.user_id != null && todayActiveUserSet.add(r.user_id));

            const todayActiveUserCount = todayActiveUserSet.size;

            // Total unique active users across all time (group by user_id)
            const totalActiveFederal = await FederalReserveGoldPackageHistory.findAll({
                attributes: [
                    "user_id",
                    [fn("DATE", col("createdAt")), "day"]
                ],
                group: ["user_id", "day"],
                raw: true,
            });

            const totalActiveGold = await GoldPackageHistory.findAll({
                attributes: [
                    "user_id",
                    [fn("DATE", col("createdAt")), "day"]
                ],
                group: ["user_id", "day"],
                raw: true,
            });

            const totalActiveMasonic = await MasonicPackageHistory.findAll({
                attributes: [
                    "user_id",
                    [fn("DATE", col("createdAt")), "day"]
                ],
                group: ["user_id", "day"],
                raw: true,
            });

            // 1) All-time unique users
            const totalActiveUserSet = new Set();

            // 2) Per-day unique users
            const dailyMap = new Map(); // day -> Set(user_id)

            const addRow = (r) => {
                if (r.user_id == null || r.day == null) return;

                // all-time unique
                totalActiveUserSet.add(r.user_id);

                // per-day unique
                const dayKey = String(r.day); // e.g. "2026-05-04"
                if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, new Set());
                dailyMap.get(dayKey).add(r.user_id);
            };

            [...totalActiveFederal, ...totalActiveGold, ...totalActiveMasonic].forEach(addRow);

            // const totalActiveUserCount = totalActiveUserSet.size;
            const sumDailyUniqueUsers = [...dailyMap.values()]
                  .reduce((sum, userSet) => sum + userSet.size, 0);

            const data = {
                today_active_user_count: todayActiveUserCount,
                total_active_user_count: sumDailyUniqueUsers,
            };

            return MyResponse(res, this.ResCode.SUCCESS.code, true, "成功", data);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TODAY_ACTIVE_USER_COUNT = async (req, res) => {
        try {
            const startDate = moment.utc().startOf("day").toDate();
            const endDate = moment.utc().add(1, "day").startOf("day").toDate();

            // 1) Today active (today)
            const [todayActiveFederal, todayActiveGold, todayActiveMasonic] = await Promise.all([
                FederalReserveGoldPackageHistory.findAll({
                    where: { createdAt: { [Op.gte]: startDate, [Op.lt]: endDate } },
                    attributes: ["user_id"],
                    raw: true,
                }),
                GoldPackageHistory.findAll({
                    where: { createdAt: { [Op.gte]: startDate, [Op.lt]: endDate } },
                    attributes: ["user_id"],
                    raw: true,
                }),
                MasonicPackageHistory.findAll({
                    where: { createdAt: { [Op.gte]: startDate, [Op.lt]: endDate } },
                    attributes: ["user_id"],
                    raw: true,
                }),
            ]);

            // Unique today active users across 3 tables
            const todayActiveUserSet = new Set();
            todayActiveFederal.forEach((r) => r.user_id != null && todayActiveUserSet.add(r.user_id));
            todayActiveGold.forEach((r) => r.user_id != null && todayActiveUserSet.add(r.user_id));
            todayActiveMasonic.forEach((r) => r.user_id != null && todayActiveUserSet.add(r.user_id));

            // 2) Active before today (yesterday or any earlier time)
            const [beforeActiveFederal, beforeActiveGold, beforeActiveMasonic] = await Promise.all([
                FederalReserveGoldPackageHistory.findAll({
                    where: { createdAt: { [Op.lt]: startDate } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
                GoldPackageHistory.findAll({
                    where: { createdAt: { [Op.lt]: startDate } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
                MasonicPackageHistory.findAll({
                    where: { createdAt: { [Op.lt]: startDate } },
                    attributes: ["user_id"],
                    group: ["user_id"],
                    raw: true,
                }),
            ]);

            const beforeTodayActiveUserSet = new Set();
            beforeActiveFederal.forEach(r => r.user_id != null && beforeTodayActiveUserSet.add(r.user_id));
            beforeActiveGold.forEach(r => r.user_id != null && beforeTodayActiveUserSet.add(r.user_id));
            beforeActiveMasonic.forEach(r => r.user_id != null && beforeTodayActiveUserSet.add(r.user_id));

            // 3) Count only users active today BUT not active before today
            const todayNewActiveUserCount = [...todayActiveUserSet]
                .filter(user_id => !beforeTodayActiveUserSet.has(user_id))
                .length;

            const data = {
                today_active_user_count: todayNewActiveUserCount,
                total_active_user_count: todayActiveUserSet.size + beforeTodayActiveUserSet.size,
            };

            return MyResponse(res, this.ResCode.SUCCESS.code, true, "成功", data);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DW_CHART = async (req, res) => {
        try {
            const userId = req.user_id;

            // current date
            const today = new Date();

            // 7 days ago (including today)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(today.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);

            const relationCondtion = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                relationCondtion.relation = { [Op.like]: `${me.relation}/%` }
            }

            const deposits = await Deposit.findAll({
                where: {
                    status: 1,
                    createdAt: {
                        [Op.between]: [sevenDaysAgo, endOfToday]
                    },
                    ...relationCondtion
                },
                attributes: [
                    [fn('DATE', col('createdAt')), 'date'],
                    [fn('SUM', col('amount')), 'totalAmount']
                ],
                group: [literal('DATE(createdAt)')],
                order: [[literal('DATE(createdAt)'), 'ASC']]
            });

            const withdraws = await Withdraw.findAll({
                where: {
                    status: 1,
                    createdAt: {
                        [Op.between]: [sevenDaysAgo, endOfToday]
                    },
                    ...relationCondtion
                },
                attributes: [
                    [fn('DATE', col('createdAt')), 'date'],
                    [fn('SUM', col('amount')), 'totalAmount']
                ],
                group: [literal('DATE(createdAt)')],
                order: [[literal('DATE(createdAt)'), 'ASC']]
            });

            const data = {
                deposits: deposits.map(d => {
                    const plain = d.get ? d.get({ plain: true }) : d; // ensure plain object
                    plain.totalAmount = Number(plain.totalAmount);
                    return plain;
                }),
                withdraws: withdraws.map(w => {
                    const plain = w.get ? w.get({ plain: true }) : w;
                    plain.totalAmount = Number(plain.totalAmount);
                    return plain;
                })
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    RECENT_DW_LIST = async (req, res) => {
        try {
            const userId = req.user_id;
            
            const relationCondtion = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                relationCondtion.relation = { [Op.like]: `${me.relation}/%` }
            }

            const deposits = await Deposit.findAll({
                where: { ...relationCondtion },
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['phone_number']
                },
                attributes: ['id', 'amount', 'status', 'createdAt'],
                order: [['id', 'DESC']],
                limit: 7
            });
            const withdraws = await Withdraw.findAll({
                where: { ...relationCondtion },
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['phone_number']
                },
                attributes: ['id', 'amount', 'status', 'createdAt'],
                order: [['id', 'DESC']],
                limit: 7
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { deposits, withdraws });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller