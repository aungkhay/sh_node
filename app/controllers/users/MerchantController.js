const { Model } = require('sequelize');
const CommonHelper = require('../../helpers/CommonHelper');
const { errLogger } = require('../../helpers/Logger');
const crypto = require("crypto");
const moment = require('moment');

class Controller {
    constructor () {
        this.commonHelper = new CommonHelper();
        this.notifyUrl = `${process.env.CALLBACK_DOMAIN}/api/recharge-callback`;
    }

    CREATE_SIGN = (params, secret) => {
        // 1. Sort keys alphabetically
        const sortedKeys = Object.keys(params).sort();

        // 2. Build query string
        const query = sortedKeys
            .map(key => `${key}=${params[key]}`)
            .join("&");

        // 3. Append secret key
        const stringToSign = query + secret;
        console.log("Sign:", stringToSign);

        // 4. MD5 hash
        return crypto.createHash("md5")
            .update(stringToSign)
            .digest("hex");
    }

    CREATE_SHA256_SIGN = (params, secret) => {
        // 1. Sort keys alphabetically
        const sortedKeys = Object.keys(params).sort();
        // 2. Build query string
        const query = sortedKeys
            .map(key => `${key}=${params[key]}`)
            .join("&");
        // 3. Append secret key
        const stringToSign = query + secret;
        console.log("Sign:", stringToSign);
        // 4. SHA256 hash
        return crypto.createHash("sha256")
            .update(stringToSign)
            .digest("hex");
    }

    /**
     * 
     * @param {Model} channel 
     * @param {Numeric} amount 
     * @param {String} pay_ip 支付IP
     * @param {Numeric} userId 用户ID
     * @returns 
     */
    LONGLONGZHIFU = async (channel, amount, pay_ip, userId) => {
        try {
            console.log("LONGLONGZHIFU");
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                pay_memberid: channel.deposit_merchant.app_id,
                pay_orderid: orderNo,
                pay_applydate: moment().format('YYYY-MM-DD HH:mm:ss'),
                pay_bankcode: channel.merchant_channel,
                pay_notifyurl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                pay_callbackurl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                pay_amount: Number(amount).toFixed(2),
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.pay_productname = encodeURIComponent(`${userId}-${orderNo}`);
            body.pay_ip = encodeURIComponent(pay_ip);
            body.pay_md5sign = sign.toUpperCase();
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[LONGLONGZHIFU] ${error.stack}`);
            return null;
        }
    }

    /**
     * 
     * @param {Model} channel 
     * @param {Numeric} amount 
     * @param {Numeric} userId 用户ID
     * @returns 
     */
    MINGRIZHIFU = async (channel, amount, userId) => {
        try {
            console.log("MINGRIZHIFU");
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                app_id: channel.deposit_merchant.app_id,
                product_id: channel.merchant_channel,
                out_trade_no: orderNo,
                notify_url: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                amount: Number(amount).toFixed(2),
                time: Math.floor(Date.now() / 1000),
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign;
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[MINGRIZHIFU] ${error.stack}`);
            return null;
        }
    }

    /**
     * 
     * @param {Model} channel 
     * @param {Numeric} amount 
     * @param {Numeric} userId 
     * @returns 
     */
    BESTZHIFU = async (channel, amount, userId) => {
        try {
            console.log("BESTZHIFU");
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mid: channel.deposit_merchant.app_id,
                merOrderTid: orderNo,
                money: Number(amount).toFixed(2),
                channelCode: channel.merchant_channel,
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
            }
            const sign = this.CREATE_SIGN(body, `&${channel.deposit_merchant.app_key}`);
            body.sign = sign;
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[BESTZHIFU] ${error.stack}`);
            return null;
        }
    }

    /**
     * 
     * @param {Model} channel 
     * @param {Numeric} amount 
     * @param {Numeric} userId 
     * @returns 
     */
    UNIFIEDZHIFU = async (channel, amount, userId) => {
        try {
            console.log("UNIFIEDZHIFU");
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mchNo: channel.deposit_merchant.app_id,
                mchOrderNo: orderNo,
                channelId: channel.merchant_channel,
                amount: Number(amount * 100).toFixed(0),
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                reqTime: Date.now(),
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign.toUpperCase();
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[UNIFIEDZHIFU] ${error.stack}`);
            return null;
        }
    }

    /**
     * 
     * @param {Model} channel 
     * @param {Numeric} amount 
     * @param {String} clientIp 
     * @param {Numeric} userId 
     * @returns 
     */
    HONGTUZHIFU = async (channel, amount, clientIp, userId) => {
        try {
            console.log("HONGTUZHIFU");
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mchId: channel.deposit_merchant.app_id,
                wayCode: `${channel.merchant_channel}`,
                subject: `${userId}-${orderNo}`,
                outTradeNo: orderNo,
                amount: Number(amount * 100).toFixed(0),
                clientIp: clientIp,
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                reqTime: Date.now(),
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign;
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[HONGTUZHIFU] ${error.stack}`);
            return null;
        }
    }

    MZHIFU = async (channel, amount, userId) => {
        try {
            console.log("MZHIFU");
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                app_id: channel.deposit_merchant.app_id,
                product_id: channel.merchant_channel,
                out_trade_no: orderNo,
                notify_url: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                amount: Number(amount).toFixed(2),
                time: Math.floor(Date.now() / 1000),
                desc: `${userId}-${orderNo}`,
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign;
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[MZHIFU] ${error.stack}`);
            return null;
        }
    }

    ALIZHIFU = async (channel, amount, clientIp, userId) => {
        try {
            console.log("ALIZHIFU");
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mchNo: channel.deposit_merchant.app_id,
                mchOrderNo: orderNo,
                productId: channel.merchant_channel,
                amount: Number(amount * 100).toFixed(0),
                clientIp: clientIp,
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                reqTime: Date.now(),
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign.toUpperCase();
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[ALIZHIFU] ${error.stack}`);
            return null;
        }
    }
    
    DONGFANG_HUITONGZHIFU = async (channel, amount, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mid: channel.deposit_merchant.app_id,
                merOrderTid: orderNo,
                money: Number(amount).toFixed(2),
                channelCode: channel.merchant_channel,
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                reqTime: Date.now(),
            }

            const sign = this.CREATE_SIGN(body, `&${channel.deposit_merchant.app_key}`);
            body.sign = sign.toLowerCase();
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[HUITONGZHIFU] ${error.stack}`); 
            return null;
        }
    }

    HUIJUZHIFU = async (channel, amount, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                memberid: channel.deposit_merchant.app_id,
                orderid: orderNo,
                bankcode: channel.merchant_channel,
                amount: Number(amount).toFixed(2),
                notifyurl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                callbackurl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign.toUpperCase();
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[HUIJUZHIFU] ${error.stack}`);
            return null;   
        }
    }

    FULINXINZHIFU = async (channel, amount, clientIp, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mchNo: channel.deposit_merchant.app_id,
                mchOrderNo: orderNo,
                productId: channel.merchant_channel,
                amount: Number(amount * 100).toFixed(0),
                clientIp: clientIp,
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                reqTime: Date.now(),
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign.toUpperCase();
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[FULINXINZHIFU] ${error.stack}`);
            return null;
        }
    }

    PAYEASYER = async (channel, amount, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                pay_memberid: channel.deposit_merchant.app_id,
                pay_orderid: orderNo,
                pay_applydate: moment().format('YYYY-MM-DD HH:mm:ss'),
                pay_bankcode: channel.merchant_channel,
                pay_notifyurl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                pay_callbackurl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                pay_amount: Number(amount).toFixed(2),
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.pay_md5sign = sign.toUpperCase();
            body.orderNo = orderNo;

            return body;
        } catch (error) {
            errLogger(`[PAYEASYER] ${error.stack}`);
            return null;
        }
    }

    JINKEZHIFU = async (channel, amount, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mchId: channel.deposit_merchant.app_id,
                productId: channel.merchant_channel,
                outTradeNo: orderNo,
                amount: Number(amount * 100).toFixed(0),
                reqTime: Date.now(),
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
            }
            const sign = this.CREATE_SIGN(body, `&key=${channel.deposit_merchant.app_key}`);
            body.sign = sign.toLocaleLowerCase();
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[JINKEZHIFU] ${error.stack}`);
            return null;
        }
    }

    HUIRUZHIFU = async (channel, amount, clientIp, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mid: channel.deposit_merchant.app_id,
                merOrderTid: orderNo,
                money: Number(amount).toFixed(2),
                channelCode: channel.merchant_channel,
                clientIp: clientIp,
                notifyUrl: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
            }
            const sign = this.CREATE_SIGN(body, `&${channel.deposit_merchant.app_key}`);
            body.sign = sign.toUpperCase();
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[HUIRUZHIFU] ${error.stack}`);
            return null;
        }
    }

    XPAYZHIFU = async (channel, amount, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mid: channel.deposit_merchant.app_id,
                orderid: orderNo,
                product_name: channel.merchant_channel,
                timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
                amount: Number(amount).toFixed(2),
                callback_url: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
                result_url: `${this.notifyUrl}/${orderNo}/${channel.deposit_merchant.id}/${userId}`,
            }
            
            // sign: SHA256(KEY)+ {data}
            const sign = crypto.createHash("sha256")
                .update(channel.deposit_merchant.app_key + JSON.stringify(body))
                .digest("hex");
            body.sign = sign.toLowerCase();
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[XPAYZHIFU] ${error.stack}`);
            return null;
        }
    }

    // 请求参数表格
    // 参数名	字段名	是否必填	类型	示例值	描述
    // 商户号	mid	是	string	"1234"	运营提供的商户号，一般是四位数字
    // 订单号	orderid	是	string	"ORDER20240226120101"	商户自定义订单号
    // 产品名	product_name	是	string	"XXX_XXX"	运营提供的产品名称，一般是XXX_XXX形式
    // 时间戳	timestamp	是	string	"2024-02-26 12:01:01"	订单创建时间
    // 金额	amount	是	float	10.01	订单金额(单位元)，可含2位小数点
    // 回调URL	callback_url	是	string	"https://example.com/notify"	异步通知回调地址
    // 结果URL	result_url	是	string	"https://example.com/result"	支付结果跳转地址
    // 用户名	username	否	string	"user"	用户名，帮助风控
    // 用户IP	userip	否	string	"192.168.1.1"	用户IP，帮助风控
    // 上下文	context	否	string	""	将在通知内原样带回
    // 备注	memo	否	string	""	订单备注
    // 用户手机	userphone	否	string	""	特殊渠道需要，一般不填
    // 用户邮件	useremail	否	string	""	特殊渠道需要，一般不填
    // 用户名字	userfirstname	否	string	""	特殊渠道需要，一般不填
    // 用户姓氏	userlastname	否	string	""	特殊渠道需要，一般不填
    XPAY360DAIFU = async (channel, amount, userId) => {
        try {
            const orderNo = await this.commonHelper.generateWithdrawOrderNo();
            const body = {
                mid: channel.withdraw_merchant.app_id,
                orderid: orderNo,
                product_name: channel.merchant_channel,
                timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
                amount: Number(amount).toFixed(2),
                callback_url: `${process.env.CALLBACK_DOMAIN}/api/withdraw-callback/${orderNo}/${channel.withdraw_merchant.id}/${userId}`,
                result_url: `${process.env.CALLBACK_DOMAIN}/api/withdraw-callback/${orderNo}/${channel.withdraw_merchant.id}/${userId}`,
            }

            // sign: SHA256(KEY)+ {data}
            const sign = crypto.createHash("sha256")
                .update(channel.withdraw_merchant.app_key + JSON.stringify(body))
                .digest("hex");
            body.sign = sign.toLowerCase();
            body.orderNo = orderNo;
            return body;
        } catch (error) {
            errLogger(`[XPAY360DAIFU] ${error.stack}`);
            return null;
        }
    }
}

module.exports = Controller