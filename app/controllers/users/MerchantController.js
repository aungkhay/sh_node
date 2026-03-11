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

    HONGTUZHIFU = async (channel, amount, userId) => {
        try {
            // mchId	商户号	是	string	M1623984572	商户号
            // wayCode	通道类型	是	string	901	通道类型，详见 通道编码
            // subject	商品标题	是	string	商品标题测试	商品标题
            // body	商品描述	否	string	商品描述测试	商品描述
            // outTradeNo	商户订单号	是	string	20160427210604000490	商户生成的订单号
            // amount	支付金额 (单位: 分)	是	int	10000	支付金额 (单位: 分)，例如: 10000 即为 100.00 元
            // extParam	扩展参数	否	string	134586944573118714	商户扩展参数,回调时会原样返回
            // clientIp	客户端IP	是	string	210.73.10.148	客户端 IPV4 地址，尽量填写
            // notifyUrl	异步通知地址	是	string	https://www.test.com/notify.htm	支付结果异步回调URL，只有传了该值才会发起回调
            // returnUrl	跳转通知地址	否	string	https://www.test.com/return.htm	支付结果同步跳转通知URL
            // reqTime	请求时间	是	long	1622016572190	请求接口时间，13位时间戳
            // sign	签名	是	string	694da7a446ab4b1d9ceea7e5614694f4	签名值，不参与签名，详见 签名算法

            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const body = {
                mchId: channel.deposit_merchant.app_id,
                wayCode: channel.merchant_channel,
                subject: `${userId}-${orderNo}`,
                outTradeNo: orderNo,
                amount: Number(amount * 100).toFixed(0),
                clientIp: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
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
}

module.exports = Controller