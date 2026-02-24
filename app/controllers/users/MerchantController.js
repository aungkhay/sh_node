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
     * @param {Model} merchant 
     * @param {Numeric} amount 
     * @param {String} pay_ip 支付IP
     * @param {Numeric} type 充值类型：1 => 微信, 2 => 支付宝, 3 => 云闪付, 4 => 银联
     * @param {Numeric} userId 用户ID
     * @returns 
     */
    LONGLONGZHIFU = async (merchant, amount, pay_ip, type, userId) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            let bankCode = 0;
            let productName = '';
            if (type == 1) {
                bankCode = 2;
                productName = '微信';
            } else if (type == 2) {
                bankCode = 1;
                productName = '支付宝';
            }
            if (bankCode === 0) {
                // Unsupported payment type
                return null;
            }

            const body = {
                pay_memberid: merchant.app_id,
                pay_orderid: orderNo,
                pay_applydate: moment().format('YYYY-MM-DD HH:mm:ss'),
                pay_bankcode: bankCode,
                pay_notifyurl: `${this.notifyUrl}/${orderNo}/${merchant.id}/${userId}`,
                pay_callbackurl: `${this.notifyUrl}/${orderNo}/${merchant.id}/${userId}`,
                pay_amount: Number(amount).toFixed(2),
            }
            const sign = this.CREATE_SIGN(body, `&key=${merchant.app_key}`);
            body.pay_productname = encodeURIComponent(`${productName}充值`);
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
     * @param {Model} merchant 
     * @param {Numeric} amount 
     * @param {Numeric} type 充值类型：1 => 微信, 2 => 支付宝, 3 => 云闪付, 4 => 银联
     * @param {Numeric} userId 
     * @returns 
     */
    MINGRIZHIFU = async (merchant, amount, type, userId) => {
        try {
            // product_id: 【22】, 产品名: 【支付宝原生（资金）】, 费率: 12.%
            // product_id: 【50】, 产品名: 【支付宝金条（资金）】, 费率: 12.%
            // product_id: 【66】, 产品名: 【金条（资金）—2】, 费率: 13.%
            // product_id: 【67】, 产品名: 【原生（资金）—2】, 费率: 12.%
            // product_id: 【68】, 产品名: 【原生（资金）—3】, 费率: 12.%

            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const products = [22, 50, 66, 67, 68];
            const product_id = products[Math.floor(Math.random() * products.length)];
            const body = {
                app_id: merchant.app_id,
                product_id: product_id,
                out_trade_no: orderNo,
                notify_url: `${this.notifyUrl}/${orderNo}/${merchant.id}/${userId}`,
                amount: Number(amount).toFixed(2),
                time: Math.floor(Date.now() / 1000),
            }
            const sign = this.CREATE_SIGN(body, `&key=${merchant.app_key}`);
            body.sign = sign;
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[MINGRIZHIFU] ${error.stack}`);
            return null;
        }
    }

    BESTZHIFU = async (merchant, amount, type, userId) => {
        try {
            // 编码666 资金转账单100-20000
            // 编码660 资金原生100-20000
            // 编码661 资金金条 100-20000
            // 编码662 资金uid转账 100-20000
            // 编码663 资金金条扫码h5 100-20000

            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const channels = [660, 661, 662, 663, 666];
            const channelCode = channels[Math.floor(Math.random() * channels.length)];
            const body = {
                mid: merchant.app_id,
                merOrderTid: orderNo,
                money: Number(amount).toFixed(2),
                channelCode: channelCode,
                notifyUrl: `${this.notifyUrl}/${orderNo}/${merchant.id}/${userId}`,
            }
            const sign = this.CREATE_SIGN(body, `&${merchant.app_key}`);
            body.sign = sign;
            body.orderNo = orderNo;
            return body;

        } catch (error) {
            errLogger(`[BESTZHIFU] ${error.stack}`);
            return null;
        }
    }
}

module.exports = Controller