const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { errLogger, commonLogger, callbackLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const { User, PaymentMethod, db, RewardRecord, Transfer, Withdraw, UserKYC, Deposit, Config, DepositMerchant, BalanceTransfer, GoldPackageHistory } = require('../../models');
const { Op, Sequelize } = require('sequelize');
const Decimal = require('decimal.js');
const axios = require('axios');
const MerchantController = require('./MerchantController');
const MerchantChannel = require('../../models/MerchantChannel');
const { encrypt } = require('../../helpers/AESHelper');

const PASS_KEY = process.env.PASS_KEY;
const PASS_IV = process.env.PASS_IV;
const PASS_PREFIX = process.env.PASS_PREFIX;
const PASS_SUFFIX = process.env.PASS_SUFFIX;

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
            callbackLogger(`[RECHARGE_CALLBACK] Received callback for orderNo: ${orderNo}, merchantId: ${merchantId}, userId: ${userId} | Body: ${JSON.stringify(req.body)}`);
            const deposit = await Deposit.findOne({ 
                where: { 
                    order_no: orderNo, 
                    deposit_merchant_id: merchantId, 
                    user_id: userId,
                    status: {
                        [Op.ne]: 1
                    }  
                } 
            });
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

                    if (reqBody.returncode === '00') {
                        status = 1;
                    } else {
                        status = 2;
                    }
                    resMsg = 'OK';
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
                        } else if (reqBody.trade_status == '2') {
                            status = 2;
                        }
                    } else {
                        status = 2;
                    }
                    resMsg = 'success';
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
                    
                    // if (bestSign === bestReqSign) {
                        if (Number(reqBody.status) == 1) {
                            status = 1;
                        } else if (Number(reqBody.status) == 2 || Number(reqBody.status) == 3) {
                            status = 2;
                        }
                    // } else {
                    //     status = 2;
                    // }
                    resMsg = 'success';
                    break;
                case 'unifiedzhifu':
                    // {"amount":"10000","payOrderId":"P2027270781915430913","mchOrderNo":"SH4459618035647253","sign":"8A931D44B8FA9AEF6F2884342DBFC88D","ifId":"8001","reqTime":"1772174061616","state":"2","mchNo":"M1771850456","channelId":"55555"}
                    const unifiedReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const unifiedCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "")
                    );
                    const unifiedSign = this.merchantController.CREATE_SIGN(unifiedCleaned, `&key=${merchant.app_key}`);
                    console.log("unifiedSign:", unifiedSign, "unifiedReqSign:", unifiedReqSign);
                    
                    // 支付订单状态 state(int): 0-订单生成, 1-待确认, 2-已确认, 3-支付失败, 4-已撤销, 5-订单关闭
                    // if (unifiedSign === unifiedReqSign) {
                        if (Number(reqBody.state) == 2) {
                            status = 1;
                        } else if ([3, 4, 5].includes(Number(reqBody.state))) {
                            status = 2;
                        }
                    // } else {
                    //     status = 2;
                    // }
                    resMsg = 'success';
                    break;
                case 'hongtuzhifu':
                    // {"mchId":"49727212754830085","tradeNo":"50081297642554117","outTradeNo":"SH5307091540326529","originTradeNo":null,"amount":"100000","subject":"5-SH5307091540326529","body":"body","state":"2","notifyTime":"1773210307117","sign":"2fe86f017672846da3a22236dfa31a3f"}
                    const hongtuReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const hongtuCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "" && value !== null)
                    );
                    console.log("hongtuCleaned:", hongtuCleaned);
                    const hongtuSign = this.merchantController.CREATE_SIGN(hongtuCleaned, `&key=${merchant.app_key}`);
                    console.log("hongtuSign:", hongtuSign, "hongtuReqSign:", hongtuReqSign);

                    // 订单状态：0=未出码，1=待支付，2=支付成功，3=支付失败，4=冲正
                    // if (hongtuSign.toLowerCase() === hongtuReqSign) {
                        if (Number(reqBody.state) == 2) {
                            status = 1;
                        } else if ([3, 4, 5].includes(Number(reqBody.state))) {
                            status = 2;
                        }
                    // } else {
                    //     status = 2;
                    // }
                    resMsg = 'SUCCESS';
                    break;

                case 'mzhifu':
                    // {"trade_no":"9041025059075120","product_id":"1","app_id":"483237a48f498b94f0317578","out_trade_no":"SH1117753039748973","trade_status":"1","amount":"300.00","real_amount":"300.00","desc":"5-SH1117753039748973","time":"1775806498","sign":"d125163599b8c936107513b2654ea814"}
                    const mzhifuReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const mzhifuCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "" && value !== null)
                    );
                    console.log("mzhifuCleaned:", mzhifuCleaned);
                    const mzhifuSign = this.merchantController.CREATE_SIGN(mzhifuCleaned, `&key=${merchant.app_key}`);
                    console.log("mzhifuSign:", mzhifuSign, "mzhifuReqSign:", mzhifuReqSign);

                    // 交易状态:1成功,-1处理中,2失败
                    if (Number(reqBody.trade_status) === 1) {
                        status = 1;
                    } else if (Number(reqBody.trade_status) === 2) {
                        status = 2;
                    }
                    resMsg = 'success';
                    break;

                case 'alizhifu':
                    // {"amount":"10000","clientIp":"103.148.104.112","createdAt":"1775809060000","ifCode":"tengcheng","mchNo":"M1775792806","mchOrderNo":"SH9441994894823039","payOrderId":"AL2042517354625167362","state":"2","successTime":"1775809180000","reqTime":"1775809180442","sign":"3D0AC9351DD8C67B5AD011EEA6196B51"}
                    const alizhifuReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const alizhifuCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "" && value !== null)
                    );
                    console.log("alizhifuCleaned:", alizhifuCleaned);
                    const alizhifuSign = this.merchantController.CREATE_SIGN(alizhifuCleaned, `&key=${merchant.app_key}`);
                    console.log("alizhifuSign:", alizhifuSign, "alizhifuReqSign:", alizhifuReqSign);

                    // 订单状态：1=支付中，2=支付成功，3=支付失败，5=测试冲正，6=订单关闭，7=出码失败
                    if (Number(reqBody.state) === 2) {
                        status = 1;
                    } else {
                        status = 2;
                    }
                    resMsg = 'success';
                    break;

                case 'dongfanghuitongzhifu':
                    // {"merOrderTid":"SH1640449825152832","tid":"XDF7931813085471411881","money":"100.00","status":1,"sign":"01F45DEF72D5981BBC14EED76C18AE72"}
                    const huitongReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const huitongCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "" && value !== null)
                    );
                    console.log("huitongCleaned:", huitongCleaned);
                    const huitongSign = this.merchantController.CREATE_SIGN(huitongCleaned, `&key=${merchant.app_key}`);
                    console.log("huitongSign:", huitongSign, "huitongReqSign:", huitongReqSign);

                    // 状态 0=待处理 1=成功 2=失败 3=异常 4=超时关闭
                    if (Number(reqBody.status) === 1) {
                        status = 1;
                    } else if ([2, 3, 4].includes(Number(reqBody.status))) {
                        status = 2;
                    }
                    resMsg = 'success';
                    break;

                case 'huijuzhifu':
                    // {"order_id":"G1457001775814500171","merchant_order_id":"SH6785662927417759","memberid":"M930245857","amount":"100.00","paid_at":1775814606,"status":1,"sign":"6488C466368C722B111E6369153C0EE4"}
                    const huijuReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const huijuCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "" && value !== null)
                    );
                    console.log("huijuCleaned:", huijuCleaned);
                    const huijuSign = this.merchantController.CREATE_SIGN(huijuCleaned, `&key=${merchant.app_key}`);
                    console.log("huijuSign:", huijuSign, "huijuReqSign:", huijuReqSign);

                    // 订单状态：1=成功, 0=失败
                    if (Number(reqBody.status) === 0) {
                        status = 2;
                    } else if (Number(reqBody.status) === 1) {
                        status = 1;
                    }
                    resMsg = 'OK';
                    break;

                case 'fulinxinzhifu':
                    // {"amount":"10000","clientIp":"161.248.87.252","createdAt":"1776395476756","ifCode":"dkpay2","mchNo":"M1776387795","mchOrderNo":"SH6190729800543056","payOrderId":"P2044976964454436866","state":"2","successTime":"1776395762162","reqTime":"1776395762231","sign":"003A9AE239BA1D63DB474F593012CA0C"}
                    const fulinxinReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const fulinxinCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "" && value !== null)
                    );
                    console.log("fulinxinCleaned:", fulinxinCleaned);
                    const fulinxinSign = this.merchantController.CREATE_SIGN(fulinxinCleaned, `&key=${merchant.app_key}`);
                    console.log("fulinxinSign:", fulinxinSign, "fulinxinReqSign:", fulinxinReqSign);

                    // 订单状态：1=支付中，2=支付成功，3=支付失败，5=测试冲正，6=订单关闭，7=出码失败（2, 5 均为支付成功）
                    if (Number(reqBody.state) === 2 || Number(reqBody.state) === 5) {
                        status = 1;
                    } else if ([3, 6, 7].includes(Number(reqBody.state))) {
                        status = 2;
                    }
                    resMsg = 'success';
                    break;
                
                case 'payeasyer':
                    const payeasyerReqSign = reqBody.sign.toLowerCase();
                    delete reqBody.sign;
                    const payeasyerCleaned = Object.fromEntries(
                        Object.entries(reqBody).filter(([key, value]) => value !== "" && value !== null)
                    );
                    console.log("payeasyerCleaned:", payeasyerCleaned);
                    const payeasyerSign = this.merchantController.CREATE_SIGN(payeasyerCleaned, `&key=${merchant.app_key}`);
                    console.log("payeasyerSign:", payeasyerSign, "payeasyerReqSign:", payeasyerReqSign);

                    // 订单状态：00=支付成功，01=支付失败
                    if (reqBody.state === '00') {
                        status = 1;
                    } else if (reqBody.state === '01') {
                        status = 2;
                    }
                    resMsg = 'OK';
                    break;

                default:
                    break;
            }

            if (deposit.status == 0 && [1, 2].includes(status)) {
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
            }

            return res.send(resMsg);
        } catch (error) {
            errLogger(`[RECHARGE_CALLBACK][${req.params.userId}]: ${JSON.stringify(req.body)}`);
            errLogger(`[RECHARGE_CALLBACK]: ${error.stack}`);
            return res.send('OK');
        }
    }

    DEPOSIT_METHOD = async (req, res) => {
        try {
            const depositMethods = await this.redisHelper.getValue('deposit_methods');
            if (depositMethods) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, JSON.parse(depositMethods));
            }
            
            const methods = [
                { id: 1, name: '微信' },
                { id: 2, name: '支付宝' },
                { id: 3, name: '云闪付' },
                { id: 4, name: '银联' },
                { id: 5, name: '纷享生活' },
            ]
            await this.redisHelper.setValue('deposit_methods', JSON.stringify(methods)); // 10 min cache

            return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, methods);
        } catch (error) {
            errLogger(`[DEPOSIT_METHOD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_PAYMENT_CHANNELS = async (req, res) => {
        try {
            const { method_id } = req.params;
            const channels = await MerchantChannel.findAll({
                where: { 
                    status: 1, 
                    payment_method: method_id 
                },
                attributes: ['id', 'payment_method', 'channel_name', 'min_amount', 'max_amount'],
                order: [['sort', 'ASC']],
            });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, channels);
        } catch (error) {
            errLogger(`[GET_PAYMENT_CHANNELS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
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

            if (amount <= 0) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '充值金额必须大于0', {});
            }

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

            // Get Channel
            const channel = await MerchantChannel.findOne({
                include: {
                    model: DepositMerchant,
                    as: 'deposit_merchant',
                },
                where: { id: req.params.channel_id, status: 1 },
            });
            if (!channel || !channel.deposit_merchant) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '充值通道无效', {});
            }
            if (parseFloat(channel.min_amount) > 0) {
                if (amount < parseFloat(channel.min_amount)) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `最低充值金额为${channel.min_amount}`, {});
                }
            }
            if (parseFloat(channel.max_amount) > 0) {
                if (amount > parseFloat(channel.max_amount)) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `最高充值金额为${channel.max_amount}`, {});
                }
            }

            let payload = null;
            let headers = { "Content-Type": "application/x-www-form-urlencoded" }
            switch (channel.deposit_merchant.app_code) {
                case 'longlongzhifu':
                    const pay_ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    payload = await this.merchantController.LONGLONGZHIFU(channel, amount, pay_ip, userId);
                    break;
                case 'mingrizhifu':
                    payload = await this.merchantController.MINGRIZHIFU(channel, amount, userId);
                    break;
                case 'bestzhifu':
                    payload = await this.merchantController.BESTZHIFU(channel, amount, userId);
                    break;
                case 'unifiedzhifu':
                    payload = await this.merchantController.UNIFIEDZHIFU(channel, amount, userId);
                    break;
                case 'hongtuzhifu':
                    const hongtuClientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    payload = await this.merchantController.HONGTUZHIFU(channel, amount, hongtuClientIp, userId);
                    headers = { "Content-Type": "application/json" }
                    break;
                case 'mzhifu':
                    payload = await this.merchantController.MZHIFU(channel, amount, userId);
                    break;
                case 'alizhifu':
                    const alizhifuClientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    payload = await this.merchantController.ALIZHIFU(channel, amount, alizhifuClientIp, userId);
                    headers = { "Content-Type": "application/json" }
                    break;
                case 'dongfanghuitongzhifu':
                    payload = await this.merchantController.DONGFANG_HUITONGZHIFU(channel, amount, userId);
                    break;
                case 'huijuzhifu':
                    payload = await this.merchantController.HUIJUZHIFU(channel, amount, userId);
                    headers = { "Content-Type": "application/json" }
                    break;
                case 'fulinxinzhifu':
                    const fulinxinzhifuClientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    payload = await this.merchantController.FULINXINZHIFU(channel, amount, fulinxinzhifuClientIp, userId);
                    headers = { "Content-Type": "application/json" }
                    break;
                case 'payeasyer':
                    payload = await this.merchantController.PAYEASYER(channel, amount, userId);
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
            console.log(headers);

            // Make Payment Request
            let response = null;
            try {
                if (channel.deposit_merchant.app_code === 'payeasyer') {
                    // use form instead of body
                    const url = channel.deposit_merchant.api;
                    const formData = new URLSearchParams();
                    for (const key in payload) {
                        formData.append(key, payload[key]);
                    }
                    response = await axios.post(url, formData.toString(), {
                        headers: headers
                    });
                } else {
                    response = await axios.post(channel.deposit_merchant.api, payload, {
                        headers: headers
                    });
                }
            } catch (error) {
                console.log(error);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '失败，请稍后再试', {});    
            }
            
            if (response.status !== 200) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '充值失败，请稍后再试', {});
            }
            console.log(response.data);

            let resData = response.data;
            let redirectUrl = null;
            let expiredTime = null;
            let data = {};
            let success = false;
            switch (channel.deposit_merchant.app_code) {
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
                case 'unifiedzhifu':
                    if (resData.code == 0) {
                        if (['payurl', 'codeImgUrl'].includes(resData.data.payDataType)) {
                            redirectUrl = resData?.data?.payData;
                        } else if (resData.data.payDataType === 'form') {
                            data = resData?.data?.payData;
                        }
                        success = true;
                    }
                    break;
                case 'hongtuzhifu':
                    if (resData.code == 0) {
                        redirectUrl = resData?.data?.payUrl;
                        expiredTime = resData?.data?.expiredTime;
                        success = true;
                    }
                    break;
                case 'mzhifu':
                    if (resData.code == 200) {
                        redirectUrl = resData?.data?.url;
                        success = true;
                    }
                    break;
                case 'alizhifu':
                    if (resData.code == 0 && resData.data?.payDataType === 'payUrl') {
                        redirectUrl = resData?.data?.payData;
                        success = true;
                    }
                    break;
                case 'dongfanghuitongzhifu':
                    if (resData.status == 0) {
                        redirectUrl = resData?.result?.payUrl;
                        success = true;
                    }
                    break;
                case 'huijuzhifu':
                    if (resData.code == 0) {
                        redirectUrl = resData?.data?.pay_url;
                        expiredTime = resData?.data?.expired_at;
                        success = true;
                    }
                    break;
                case 'fulinxinzhifu':
                    if (resData.code == 0 && resData.data?.payDataType === 'payUrl') {
                        redirectUrl = resData?.data?.payData;
                        success = true;
                    }
                    break;
                case 'payeasyer':
                    if (resData.returncode == '00') {
                        // redirectUrl = resData?.data?.payUrl;
                        success = true;
                    }
                    break;
                default:
                    break;
            }

            if (success) {
                await Deposit.create({
                    deposit_merchant_id: channel.deposit_merchant_id,
                    order_no: orderNo,
                    type: channel.payment_method,
                    user_id: user.id,
                    relation: user.relation,
                    amount: amount,
                    before_amount: Number(user.reserve_fund),
                    after_amount: Number(parseFloat(user.reserve_fund) + parseFloat(amount)),
                });
            }

            if (success) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', redirectUrl ? { redirectUrl, expiredTime } : data);
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
                attributes: ['id', 'order_no', 'type', 'amount', 'status', 'description', 'createdAt'],
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

            const withdraw_time = await this.redisHelper.getValue('withdraw_time'); // 10:00:00-17:00:00
            if (withdraw_time) {
                const [startTime, endTime] = withdraw_time.split('-'); // ['10:00:00', '17:00:00']
                const currentTime = new Date().toTimeString().split(' ')[0];
                if (currentTime < startTime || currentTime >= endTime) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `提现时段：每日${startTime}-${endTime}`, {});
                }
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const todayWithdrawCount = await Withdraw.count({
                where: {
                    user_id: req.user_id,
                    createdAt: {
                        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
                        [Op.lt]: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }
            });
            if (todayWithdrawCount == 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '每天可以申请提现一次，预计一个工作日内到账', {}); 
            }

            const userId = req.user_id;
            const amount = parseFloat(req.body.amount);
            const withdrawBy = req.body.withdrawBy;
            const paymentPassword = req.body.payment_password;
            const order_no = await this.commonHelper.generateWithdrawOrderNo();

            const user = await User.findByPk(userId, {
                attributes: ['id', 'balance', 'relation', 'can_withdraw', 'is_withdraw_active_code_used', 'createdAt', 'payment_password']
            });
            if (!user.can_withdraw) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您没有提现权限! 请联系官方', {});
            }
            const encryptedPaymentPassword = encrypt(PASS_PREFIX + paymentPassword + PASS_SUFFIX, PASS_KEY, PASS_IV);
            if (encryptedPaymentPassword !== user.payment_password) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付密码错误', {});
            }
            // check createdAt is before 2026-04-10
            if (!user.is_withdraw_active_code_used && new Date(user.createdAt) < new Date('2026-04-10')) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请您在个人中心-我的军职-当前军职中，查看上级联系方式，按提示添加联系人并登记后使用激活码恢复账户', {});
            }

            if (Number(amount) < 50) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '最低提现金额为50', {});
            }

            if (Number(amount) > Number(user.balance)) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '余额不足', {});
            }

            // 10% handle_fee
            const handle_fee = new Decimal(amount).times(0.1).toNumber();

            const t = await db.transaction();
            try {
                await Withdraw.create({
                    order_no: order_no,
                    type: withdrawBy,
                    user_id: userId,
                    relation: user.relation,
                    amount: Number(amount),
                    handle_fee: Number(handle_fee),
                    before_amount: Number(user.balance),
                    after_amount: Number(user.balance) - Number(amount),
                }, { transaction: t });
                await user.increment({ balance: -Number(amount) }, { transaction: t });

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
                attributes: ['id', 'type', 'amount', 'handle_fee', 'status', 'description', 'createdAt'],
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
        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '暂时不可用', {});

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

    GET_RECEIVER_ACCOUNT = async (req, res) => {
        try {
            const receiver_phone = req.query.receiver_phone;
            if (!receiver_phone) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请输入收款账号', {});
            }

            const user = await User.findOne({
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['id', 'status'],
                },
                where: { phone_number: receiver_phone },
                attributes: ['id', 'name', 'phone_number']
            });

            if (!user) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未找到收款账号', {});
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '获取成功', { receiver: user });
        } catch (error) {
            errLogger(`[GET_RECEIVER_ACCOUNT][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TRANSFER_BALANCE = async (req, res) => {
        const lockKey = `lock:transfer_balance:${req.user_id}`;
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
            const { amount, receiver_phone, payment_password } = req.body;

            // if (amount < 50) {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '储备金不能小于50', {});
            // }

            const sender = await User.findByPk(userId, {
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['id', 'status'],
                },
                attributes: ['id', 'relation', 'reserve_fund', 'can_withdraw', 'is_withdraw_active_code_used', 'createdAt', 'payment_password'],
            });

            if (!sender.kyc || sender.kyc.status !== 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请实名认证后再进行转账', {});
            }

            if (!sender.can_withdraw) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您没有提现权限! 请联系官方', {});
            }

            const encryptedPaymentPassword = encrypt(PASS_PREFIX + payment_password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            if (encryptedPaymentPassword !== sender.payment_password) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付密码错误', {});
            }

            if (parseFloat(amount) > parseFloat(sender.reserve_fund)) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '储备金不足', {});
            }
                
            if (!sender.is_withdraw_active_code_used && new Date(sender.createdAt) < new Date('2026-04-10')) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请激活后再进行转账', {});
                
                // 未激活用户无法转出（储备金有使用记录就算激活）
                const goldPackageHistoryCount = await GoldPackageHistory.count({
                    where: {
                        user_id: userId
                    }
                });
                const transferOutCount = await Transfer.count({
                    where: {
                        wallet_type: 1, // reserve fund
                        user_id: userId,
                    }
                });
                
                if (!sender.is_withdraw_active_code_used || (goldPackageHistoryCount === 0 && transferOutCount === 0)) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请激活后再进行转账', {});
                }
            }

            const receiver = await User.findOne({
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['id', 'status'],
                },
                where: { phone_number: receiver_phone },
                attributes: ['id', 'name', 'phone_number', 'reserve_fund']
            });

            if (!receiver) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未找到收款账号', {});
            }
            if (receiver.id === sender.id) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '不能转账给自己', {});
            }
            if (!receiver.kyc || receiver.kyc.status !== 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '收款账号未实名认证', {});
            }

            const t = await db.transaction();
            try {
                await BalanceTransfer.create({
                    relation: sender.relation,
                    from_user: sender.id,
                    to_user: receiver.id,
                    wallet_type: 1,
                    amount: amount,
                    before_from_amount: Number(sender.reserve_fund),
                    after_from_amount: Number(parseFloat(sender.reserve_fund) - parseFloat(amount)),
                    before_to_amount: Number(receiver.reserve_fund),
                    after_to_amount: Number(parseFloat(receiver.reserve_fund) + parseFloat(amount)),
                }, { transaction: t });
                await sender.increment({ reserve_fund: -amount }, { transaction: t });
                await receiver.increment({ reserve_fund: amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '转账成功', {});
            } catch (error) {
                errLogger(`[TRANSFER_BALANCE][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[TRANSFER_BALANCE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    BALANCE_TRANSFER_HISTORY = async (req, res) => {
        try {
            const userId = req.user_id;
            const page = parseInt(req.query.page) || 1;
            const perPage = parseInt(req.query.perPage) || 10;

            const { rows, count } = await BalanceTransfer.findAndCountAll({
                where: {
                    [Op.or]: [
                        { from_user: userId },
                        { to_user: userId }
                    ]
                },
                include: {
                    model: User,
                    as: 'to',
                    attributes: ['id', 'name', 'phone_number']
                },
                attributes: ['id', 'amount', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: this.getOffset(page, perPage)
            });

            const data = {
                records: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    total: count,
                    totalPages: Math.ceil(count / perPage)
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '获取转账记录成功', data);
        } catch (error) {
            errLogger(`[TRANSFER_BALANCE_RECORDS][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

}

module.exports = Controller