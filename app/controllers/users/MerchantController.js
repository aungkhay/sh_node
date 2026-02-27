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
}

module.exports = Controller