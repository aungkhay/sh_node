const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Deposit, Withdraw, User, UserKYC, PaymentMethod } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');

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
            const userId = req.user_id;

            const relationCondtion = {};
            if (userId !== 1) {
                relationCondtion.relation = { [Op.like]: `%/${userId}/%` }
            }

            const todayCondition = {
                status: 1,
                createdAt: {
                    [Op.between]: [startOfToday, endOfToday]
                },
                ...relationCondtion
            };

            const todayDepositAmount = await Deposit.sum('amount', { where: todayCondition });
            const todayDepositCount = await Deposit.count({ where: todayCondition });
            const todayWithdrawAmount = await Withdraw.sum('amount', { where: todayCondition });
            const todayWithdrawCount = await Withdraw.count({ where: todayCondition });

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

            const data = {
                today_deposit_amount: todayDepositAmount ? Number(todayDepositAmount) : 0,
                today_deposit_count: todayDepositCount ?? 0,
                today_withdraw_amount: todayWithdrawAmount ? Number(todayWithdrawAmount) : 0,
                today_withdraw_count: todayWithdrawCount ?? 0,
                total_user: totalUser ?? 0,
                today_register: todayRegister ?? 0,
                kyc_pending_count: kycPendingCount ?? 0,
                payment_pending_count: paymentPendingCount ?? 0,
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
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
            if (userId !== 1) {
                relationCondtion.relation = { [Op.like]: `%/${userId}/%` }
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
            if (userId !== 1) {
                relationCondtion.relation = { [Op.like]: `%/${userId}/%` }
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