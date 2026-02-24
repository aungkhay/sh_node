const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { errLogger, commonLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const { User, PaymentMethod, db, RewardRecord, Transfer, Withdraw, UserKYC, Deposit, Config, DepositMerchant } = require('../../models');
const { Op, Sequelize } = require('sequelize');
const Decimal = require('decimal.js');
const axios = require('axios');
const MerchantController = require('./MerchantController');
const e = require('cors');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new RedisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
        this.merchantController = new MerchantController();
        this.getOffset = this.commonHelper.getOffset;
    }

    RECHARGE_CALLBACK = async (req, res) => {
        try {
            const { orderNo, merchantId, userId } = req.params;
            commonLogger(`[RECHARGE_CALLBACK] Received callback for orderNo: ${orderNo}, merchantId: ${merchantId}, userId: ${userId} | Body: ${JSON.stringify(req.body)}`);
            const deposit = await Deposit.findOne({ where: { order_no: orderNo, deposit_merchant_id: merchantId, user_id: userId, status: 0 } });
            if (!deposit) {
                return res.send('');
            }
            const merchant = await DepositMerchant.findByPk(merchantId);
            if (!merchant) {
                return res.send('');
            }

            const user = await User.findByPk(userId, { attributes: ['id', 'reserve_fund'] });

            let status = 0;
            let resMsg = '';
            let reqBody = req.body;

            switch (merchant.app_code) {
                case 'longlongzhifu':
                    // {"memberid":"260309553","orderid":"SH7603007351869732","transaction_id":"LL02241956481ee6f9a5241947","amount":"100.0000","datetime":"20260224202527","returncode":"00","sign":"170B4A98ABB258674096BDC8EE9BFF04","attach":""}
                    // check sign first
                    const longlongReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const longlongCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "")
                    );
                    const longlongSign = this.merchantController.CREATE_SIGN(longlongCleaned, `&key=${merchant.app_key}`);
                    console.log("longlongSign:", longlongSign, "longlongReqSign:", longlongReqSign);

                    if (longlongSign.toUpperCase() === longlongReqSign && reqBody.returncode === '00') {
                        status = 1;
                        resMsg = 'OK';
                    } else {
                        status = 2;
                    }
                    break;
                case 'mingrizhifu':
                    // {"trade_no":"9022447186385998","product_id":"66","app_id":"5fd28cb0ebb68e3105242560","out_trade_no":"SH0416990468295762","trade_status":"1","amount":"100.00","real_amount":"100.00","desc":"","time":"1771939137","sign":"f3e2114774904f9c8cfbcc72649e292d"}
                    const mingriReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const mingriCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "")
                    );
                    const mingriSign = this.merchantController.CREATE_SIGN(mingriCleaned, `&key=${merchant.app_key}`);
                    console.log("mingriSign:", mingriSign, "mingriReqSign:", mingriReqSign);
                    
                    if (mingriSign === mingriReqSign) {
                        if (reqBody.trade_status == '1') {
                            status = 1;
                            resMsg = 'success';
                        } else if (reqBody.trade_status == '2') {
                            status = 2;
                        }
                    } else {
                        status = 2;
                    }
                    break;
                case 'bestzhifu':
                    // {"merOrderTid":"SH1089649960530725","tid":"BS7773172551926455356","money":"100.00","status":1,"sign":"04696E5C831C3C3390819524A2C79B73"}
                    const bestReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const bestCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "")
                    );
                    const bestSign = this.merchantController.CREATE_SIGN(bestCleaned, `&${merchant.app_key}`);
                    console.log("bestSign:", bestSign, "bestReqSign:", bestReqSign);
                    
                    if (bestSign === bestReqSign) {
                        if (reqBody.status == '1') {
                            status = 1;
                            resMsg = 'success';
                        } else if (reqBody.status == '2' || reqBody.status == '3') {
                            status = 2;
                        }
                    } else {
                        status = 2;
                    }
                    break;
                default:
                    break;
            }

            const t = await db.transaction();
            try {
                await deposit.update({ status: status, callback_data: JSON.stringify(reqBody) }, { transaction: t });
                if (status === 1) {
                    await user.increment({ reserve_fund: Number(deposit.amount) }, { transaction: t });
                }
                await t.commit();
            } catch (error) {
                await t.rollback();
                errLogger(`[RECHARGE_CALLBACK][${userId}]: ${error.stack}`);
            }

            return res.send(resMsg);
        } catch (error) {
            return res.send('');
        }
    }

    DEPOSIT = async (req, res) => {
        const lockKey = `lock:deposit:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const can_deposit = await this.redisHelper.getValue('can_deposit');
            if (!can_deposit || can_deposit != '1') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '充值未开通！', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            let deposit_time = await this.redisHelper.getValue('deposit_time'); // 12:00:00-17:00:00
            if (!deposit_time) {
                const config = await Config.findOne({ where: { type: 'deposit_time' }, attributes: ['val'] });
                await this.redisHelper.setValue('deposit_time', config.val);
                deposit_time = config.val;
            }
            // Parse start and end times
            const [startTime, endTime] = deposit_time.split('-'); // ['12:00:00', '17:00:00']
            const today = new Date();
            const currentTime = today.toTimeString().split(' ')[0]; // "HH:mm:ss"
            if (currentTime < startTime || currentTime >= endTime) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '不允许充值', { allow: { start: startTime, end: endTime } });
            }

            const userId = req.user_id;
            const { type, amount } = req.body;

            const user = await User.findByPk(userId, {
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['id', 'status']
                },
                attributes: ['id', 'reserve_fund', 'relation']
            });

            if (!user.kyc) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请验证实名', {});
            }
            if (user.kyc.status === 'DENIED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '实名认证已被拒绝', {});
            }
            if (user.kyc.status === 'PENDING') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '实名认证审核中，请稍后再试', {});
            }

            // Generate Payment URL
            const merchant = await DepositMerchant.findOne({
                where: { 
                    status: 1,
                    allow_type: { [Op.like]: `%${type}%` }
                },
                attributes: ['id', 'api', 'app_id', 'app_code', 'app_key', 'min_amount', 'max_amount'],
                order: db.random()
            });
            if (!merchant) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '暂无可用的充值通道', {});
            }
            if (amount < parseFloat(merchant.min_amount) || (parseFloat(merchant.max_amount) > 0 && amount > parseFloat(merchant.max_amount))) {
                let resMsg = `最低充值金额为${merchant.min_amount}`;
                if (parseFloat(merchant.max_amount) > 0) {
                    resMsg += `，最高充值金额为${merchant.max_amount}`;
                }
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, resMsg, {});
            }

            let payload = null;
            switch (merchant.app_code) {
                case 'longlongzhifu':
                    const pay_ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    payload = await this.merchantController.LONGLONGZHIFU(merchant, amount, pay_ip, type, userId);
                    break;
                case 'mingrizhifu':
                    payload = await this.merchantController.MINGRIZHIFU(merchant, amount, type, userId);
                    break;
                case 'bestzhifu':
                    payload = await this.merchantController.BESTZHIFU(merchant, amount, type, userId);
                    break;
                default:
                    break;
            }
            if (!payload) {
                return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, '生成充值订单失败，请稍后再试', {});
            }

            const orderNo = payload.orderNo;
            delete payload.orderNo;
            console.log(payload);

            // Make Payment Request
            const response = await axios.post(merchant.api, payload, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            });
            if (response.status !== 200) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '充值失败，请稍后再试', {});
            }
            console.log(response.data);

            let resData = response.data;
            let redirectUrl = null;
            let success = false;
            switch (merchant.app_code) {
                case 'longlongzhifu':
                    if (resData.status == 1) {
                        redirectUrl = resData?.h5_url;
                        success = true;
                    }
                    break;
                case 'mingrizhifu':
                    if (resData.code == 200) {
                        redirectUrl = resData?.data?.url;
                        success = true;
                    }
                    break;
                case 'bestzhifu':
                    if (resData.status == 0) {
                        redirectUrl = resData?.result?.payUrl;
                        success = true;
                    }
                    break;
                default:
                    break;
            }

            if (success) {
                await Deposit.create({
                    deposit_merchant_id: merchant.id,
                    order_no: orderNo,
                    type: type,
                    user_id: user.id,
                    relation: user.relation,
                    amount: amount,
                    before_amount: Number(user.reserve_fund),
                    after_amount: Number(parseFloat(user.reserve_fund) + parseFloat(amount)),
                });
            }

            // Reserve Fund
            // const t = await db.transaction();
            // try {
            //     await Deposit.create({
            //         deposit_merchant_id: merchant.id,
            //         order_no: orderNo,
            //         type: type,
            //         user_id: user.id,
            //         relation: user.relation,
            //         amount: amount,
            //         before_amount: Number(user.reserve_fund),
            //         after_amount: Number(parseFloat(user.reserve_fund) + parseFloat(amount)),
            //         status: 1
            //     }, { transaction: t });
            //     await user.increment({ reserve_fund: Number(amount) }, { transaction: t });

            //     await t.commit();
            // } catch (error) {
            //     console.log(error);
            //     errLogger(`[DEPOSIT][${req.user_id}]: ${error.stack}`);
            //     await t.rollback();
            //     return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            // }

            if (success) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', redirectUrl ? { redirectUrl } : {});
            } else {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '失败，请稍后再试', {});    
            }
        } catch (error) {
            console.log(error)
            errLogger(`[DEPOSIT][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DEPOSIT_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            const { rows, count } = await Deposit.findAndCountAll({
                where: { user_id: req.user_id },
                attributes: ['id', 'type', 'amount', 'status', 'description', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                records: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    WITHDRAW = async (req, res) => {
        const lockKey = `lock:withdraw:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            // const today = new Date();
            // const day = today.getDay();
            // if (day === 0 || day === 6) {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请在工作日进行提现提交', {});
            // }

            const can_withdraw = await this.redisHelper.getValue('can_withdraw');
            if (!can_withdraw || Number(can_withdraw) != 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请在工作日进行提现提交', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = parseFloat(req.body.amount);
            const withdrawBy = req.body.withdrawBy;
            const order_no = await this.commonHelper.generateWithdrawOrderNo();

            const user = await User.findByPk(userId, {
                attributes: ['id', 'balance', 'relation']
            });

            if (amount < 100) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '最低提现金额为100', {});
            }

            if (amount > parseFloat(user.balance)) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '余额不足', {});
            }

            const t = await db.transaction();
            try {
                await Withdraw.create({
                    order_no: order_no,
                    type: withdrawBy,
                    user_id: userId,
                    relation: user.relation,
                    amount: amount,
                    before_amount: Number(user.balance),
                    after_amount: Number(parseFloat(user.balance) - amount),
                }, { transaction: t });
                await user.increment({ balance: -amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '提现成功', {});
            } catch (error) {
                errLogger(`[WITHDRAW][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[WITHDRAW][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    WITHDRAW_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            const { rows, count } = await Withdraw.findAndCountAll({
                where: { user_id: req.user_id },
                attributes: ['id', 'type', 'amount', 'status', 'description', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                records: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_BALANCE_TO_RESERVE_FUND = async (req, res) => {
        const lockKey = `lock:transfer_balance_to_reserve_fund:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = req.body.amount;

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, {
                    attributes: ['id', 'relation', 'reserve_fund', 'balance'],
                    transaction: t,
                });

                if (amount > user.balance) {
                    throw new Error('余额不足');
                }
                
                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 2, // balance
                    amount: amount,
                    from: 2, // balance
                    to: 1, // reserve_fund
                    before_from_amount: Number(user.balance),
                    after_from_amount: Number(parseFloat(user.balance) - parseFloat(amount)),
                    before_to_amount: Number(user.reserve_fund),
                    after_to_amount: Number(parseFloat(user.reserve_fund) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });
                await user.increment({ reserve_fund: amount, balance: -amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '转账成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_BALANCE_TO_RESERVE_FUND][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_BALANCE_TO_RESERVE_FUND][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    // Not Used
    TRANSFER_REFERRAL_BONUS_TO_BALANCE = async (req, res) => {
        const lockKey = `lock:transfer_referral_bonus_to_balance:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const today = new Date();
            const day = today.getDay();
            // if (day < 6) {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请于周日转账', {});
            // }

            let refConf = await this.redisHelper.getValue('withdrawal_time_for_referral_bonus'); // 12:00:00-17:00:00
            if (!refConf) {
                const config = await Config.findOne({ where: { type: 'withdrawal_time_for_referral_bonus' }, attributes: ['val'] });
                await this.redisHelper.setValue('withdrawal_time_for_referral_bonus', config.val);
                refConf = config.val;
            }
            // Parse start and end times
            const [startTime, endTime] = refConf.split('-'); // ['12:00:00', '17:00:00']
            const currentTime = today.toTimeString().split(' ')[0]; // "HH:mm:ss"

            if (currentTime < startTime || currentTime >= endTime) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '不允许转让', { allow: { start: startTime, end: endTime } });
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = req.body.amount;

            const startOfWeek = new Date(today)
            startOfWeek.setHours(0, 0, 0, 0)
            startOfWeek.setDate(today.getDate() - day) // go back to Sunday

            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 7) // next Sunday (exclusive)
            const transfer = await Transfer.findOne({
                where: {
                    user_id: userId,
                    wallet_type: 3, // referral
                    from: 3, // referral
                    to: 2, // balance
                    createdAt: {
                        [Op.gte]: startOfWeek,
                        [Op.lt]: endOfWeek,
                    },
                },
                attributes: ['id']
            });
            if (transfer) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '本周已完成转账', {});
            }
            const record = await RewardRecord.findOne({
                where: {
                    user_id: userId,
                    is_used: 0,
                    reward_id: {
                        [Op.or]: [4, 6]
                    }
                },
                order: [['id', 'ASC']],
            });

            const t = await db.transaction();
            try {

                const user = await User.findByPk(userId, {
                    attributes: ['id', 'relation', 'referral_bonus', 'balance'],
                    transaction: t
                });

                if (parseFloat(amount) > parseFloat(user.referral_bonus)) {
                    throw new Error('推荐金不足');
                }

                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 3, // referral
                    amount: amount,
                    from: 3, // referral
                    to: 2, // balance
                    before_from_amount: Number(user.referral_bonus),
                    after_from_amount: Number(parseFloat(user.referral_bonus) - parseFloat(amount)),
                    before_to_amount: Number(user.balance),
                    after_to_amount: Number(parseFloat(user.balance) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });
                await user.increment({ referral_bonus: -amount, balance: amount }, { transaction: t });
                if (record) {
                    await record.update({ is_used: 1 }, { transaction: t });
                }

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '转账成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_REFERRAL_BONUS_TO_BALANCE][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                if (record) {
                    await record.update({ is_used: 1 });
                }
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_REFERRAL_BONUS_TO_BALANCE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    // Not Used
    TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND = async (req, res) => {
        try {
            const today = new Date();
            const day = today.getDay();
            const hour = today.getHours();
            if (day < 6) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请于周日转账', {});
            }

            const refConf = this.redisHelper.getValue('withdrawal_time_for_referral_bonus'); // 12:00:00-17:00:00
            // Parse start and end times
            const [startTime, endTime] = refConf.split('-'); // ['12:00:00', '17:00:00']
            const currentTime = today.toTimeString().split(' ')[0]; // "HH:mm:ss"

            if (currentTime < startTime || currentTime >= endTime) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '不允许转让', { allow: { start: startTime, end: endTime } });
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = req.body.amount;

            const user = await User.findByPk(userId, {
                attributes: ['id', 'relation', 'referral_bonus', 'reserve_fund']
            });

            if (amount > user.referral_bonus) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '推荐金不足', {});
            }

            const startOfWeek = new Date(today)
            startOfWeek.setHours(0, 0, 0, 0)
            startOfWeek.setDate(today.getDate() - day) // go back to Sunday

            const endOfWeek = new Date(startOfWeek)
            endOfWeek.setDate(startOfWeek.getDate() + 7) // next Sunday (exclusive)
            const transfer = await Transfer.findOne({
                where: {
                    user_id: userId,
                    wallet_type: 3, // referral
                    from: 3, // referral
                    to: 1, // reserve
                    createdAt: {
                        [Op.gte]: startOfWeek,
                        [Op.lt]: endOfWeek,
                    },
                },
                attributes: ['id']
            });
            if (transfer) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '本周已完成转账', {});
            }
            const record = await RewardRecord.findOne({
                where: {
                    user_id: userId,
                    is_used: 0,
                    reward_id: {
                        [Op.or]: [4, 6]
                    }
                },
                order: [['id', 'ASC']],
            });

            const t = await db.transaction();
            try {
                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 3, // referral
                    amount: amount,
                    from: 3, // referral
                    to: 1, // reserve
                    before_from_amount: Number(user.referral_bonus),
                    after_from_amount: Number(parseFloat(user.referral_bonus) - parseFloat(amount)),
                    before_to_amount: Number(user.reserve_fund),
                    after_to_amount: Number(parseFloat(user.reserve_fund) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });
                await user.increment({ reserve_fund: amount, referral_bonus: -amount }, { transaction: t });
                if (record) {
                    await record.update({ is_used: 1 }, { transaction: t });
                }

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '转账成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                if (record) {
                    await record.update({ is_used: 1 });
                }
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REFERRAL_BONUS_COUPONS = async (req, res) => {
        try {
            const userId = req.user_id;
            const coupons = await RewardRecord.findAll({
                where: {
                    user_id: userId,
                    reward_id: 8, // 推荐金提取券
                    check_in_type: {
                        [Op.ne]: 2 // Not 补签卡
                    }
                },
                attributes: ['id', 'amount', 'is_used', 'validedAt', 'createdAt'],
                order: [['id', 'DESC']]
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { coupons });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_REFERRAL_BONUS_TO_BALANCE_BY_COUPON = async (req, res) => {
        const lockKey = `lock:transfer_referral_bonus_to_balance_by_coupon:${req.user_id}`;
        let redisLocked = false;
        try {

            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const userId = req.user_id;
            const id = req.params.id;
           

            const t = await db.transaction();
            try {
                 const rewardRecord = await RewardRecord.findOne({
                    where: {
                        id: id,
                        user_id: userId,
                        is_used: 0,
                        reward_id: 8 // 推荐金提取券
                    },
                    attributes: ['id', 'amount', 'validedAt'],
                    transaction: t
                });

                if (!rewardRecord) {
                    throw new Error('未持有推荐金提取券');
                }

                // can use after validedAt
                if (new Date() < new Date(rewardRecord.validedAt)) {
                    throw new Error('推荐金提取券未到使用日期');
                }

                const user = await User.findByPk(userId, {
                    attributes: ['id', 'relation', 'referral_bonus', 'balance'],
                    transaction: t
                });

                if (user.referral_bonus <= 0) {
                    throw new Error('推荐金不足');
                }

                const amount = new Decimal(user.referral_bonus)
                    .times(rewardRecord.amount)
                    .times(0.01)
                    .toNumber();
                    
                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 3, // referral
                    reward_id: 8,
                    amount: amount,
                    from: 3, // referral
                    to: 2, // balance
                    before_from_amount: Number(user.referral_bonus),
                    after_from_amount: Number(parseFloat(user.referral_bonus) - parseFloat(amount)),
                    before_to_amount: Number(user.balance),
                    after_to_amount: Number(parseFloat(user.balance) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });

                await rewardRecord.update({ is_used: 1 }, { transaction: t });
                await user.increment({ referral_bonus: -amount, balance: amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '提交成功！请等待审核', {});

            } catch (error) {
                errLogger(`[TRANSFER_REFERRAL_BONUS_TO_BALANCE_BY_COUPON][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }

        } catch (error) {
            errLogger(`[TRANSFER_REFERRAL_BONUS_TO_BALANCE_BY_COUPON][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND_BY_COUPON = async (req, res) => {
        const lockKey = `lock:transfer_referral_bonus_to_reserve_fund_by_coupon:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const userId = req.user_id;
            const id = req.params.id;

            const t = await db.transaction();
            try {
                const rewardRecord = await RewardRecord.findOne({
                    where: {
                        id: id,
                        user_id: userId,
                        is_used: 0,
                        reward_id: 8 // 推荐金提取券
                    },
                    attributes: ['id', 'amount', 'validedAt'],
                    transaction: t
                });

                if (!rewardRecord) {
                    throw new Error('未持有推荐金提取券');
                }

                // can use after validedAt
                if (new Date() < new Date(rewardRecord.validedAt)) {
                    throw new Error('推荐金提取券未到使用日期');
                }

                const user = await User.findByPk(userId, {
                    attributes: ['id', 'relation', 'referral_bonus', 'reserve_fund'],
                    transaction: t
                });

                if (user.referral_bonus <= 0) {
                    throw new Error('推荐金不足');
                }

                const amount = new Decimal(user.referral_bonus)
                    .times(rewardRecord.amount)
                    .times(0.01)
                    .toNumber();
                    
                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 3, // referral
                    reward_id: 8,
                    amount: amount,
                    from: 3, // referral
                    to: 1, // reserve
                    before_from_amount: Number(user.referral_bonus),
                    after_from_amount: Number(parseFloat(user.referral_bonus) - parseFloat(amount)),
                    before_to_amount: Number(user.reserve_fund),
                    after_to_amount: Number(parseFloat(user.reserve_fund) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });

                await rewardRecord.update({ is_used: 1 }, { transaction: t });
                await user.increment({ referral_bonus: -amount, reserve_fund: amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '提交成功！请等待审核', {});
            } catch (error) {
                errLogger(`[TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND_BY_COUPON][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }

        } catch (error) {
            errLogger(`[TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND_BY_COUPON][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_ALLOWANCE_TO_BALANCE = async (req, res) => {
        const lockKey = `lock:transfer_allowance_to_balance:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = req.body.amount;

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, { 
                    attributes: ['id', 'relation', 'rank_allowance', 'balance'],
                    transaction: t 
                });
                if (amount > user.rank_allowance) {
                    throw new Error('津贴不足');
                }
                
                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 5, // allowance
                    amount: amount,
                    from: 5, // allowance
                    to: 2, // balance
                    before_from_amount: Number(user.rank_allowance),
                    after_from_amount: Number(parseFloat(user.rank_allowance) - parseFloat(amount)),
                    before_to_amount: Number(user.balance),
                    after_to_amount: Number(parseFloat(user.balance) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });
                await user.increment({ balance: amount, rank_allowance: -amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '转账成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_ALLOWANCE_TO_BALANCE][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_ALLOWANCE_TO_BALANCE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_BALANCE_TO_EARN = async (req, res) => {
        const lockKey = `lock:transfer_balance_to_earn:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = req.body.amount;

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, { 
                    attributes: ['id', 'relation', 'earn', 'balance'],
                    transaction: t 
                });
                if (parseFloat(amount) > parseFloat(user.balance)) {
                    throw new Error('余额不足');
                }
                
                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 2, // balance
                    amount: amount,
                    from: 2, // balance
                    to: 7, // earn
                    before_from_amount: Number(user.balance),
                    after_from_amount: Number(parseFloat(user.balance) - parseFloat(amount)),
                    before_to_amount: Number(user.earn),
                    after_to_amount: Number(parseFloat(user.earn) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });
                await user.increment({ balance: -amount, earn: amount, earn_out_limit: amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '转账成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_BALANCE_TO_EARN][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_BALANCE_TO_EARN][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_EARN_TO_BALANCE = async (req, res) => {
        const lockKey = `lock:transfer_earn_to_balance:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = req.body.amount;

            

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, { 
                    attributes: ['id', 'relation', 'earn', 'earn_out_limit', 'balance'],
                    transaction: t
                });
                if (parseFloat(amount) > parseFloat(user.earn_out_limit)) {
                    throw new Error('余额宝资金不足，请重试');
                }

                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 7, // earn
                    amount: amount,
                    from: 7, // earn
                    to: 2, // balance
                    before_from_amount: Number(user.earn),
                    after_from_amount: Number(parseFloat(user.earn) - parseFloat(amount)),
                    before_to_amount: Number(user.balance),
                    after_to_amount: Number(parseFloat(user.balance) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });
                await user.increment({ balance: amount, earn: -amount, earn_out_limit: -amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '转账成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_EARN_TO_BALANCE][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_EARN_TO_BALANCE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_GOLD_INTEREST_TO_BALANCE = async (req, res) => {
        const lockKey = `lock:transfer_gold_interest_to_balance:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const amount = req.body.amount;

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, { 
                    attributes: ['id', 'relation', 'gold_interest', 'balance'],
                    transaction: t 
                });
                if (parseFloat(amount) > parseFloat(user.gold_interest)) {
                    throw new Error('黄金息不足');
                }
                
                await Transfer.create({
                    relation: user.relation,
                    user_id: userId,
                    wallet_type: 8, // gold_interest
                    amount: amount,
                    from: 8, // gold_interest
                    to: 2, // balance
                    before_from_amount: Number(user.gold_interest),
                    after_from_amount: Number(parseFloat(user.gold_interest) - parseFloat(amount)),
                    before_to_amount: Number(user.balance),
                    after_to_amount: Number(parseFloat(user.balance) + parseFloat(amount)),
                    status: 'APPROVED'
                }, { transaction: t });
                await user.increment({ balance: parseFloat(amount), gold_interest: -parseFloat(amount) }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '提取成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_EARN_TO_BALANCE][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || '提取失败', {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_EARN_TO_BALANCE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller