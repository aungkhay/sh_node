const CommonHelper = require('../../helpers/CommonHelper');
const { errLogger } = require('../../helpers/Logger');
const crypto = require("crypto");

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
        const stringToSign = query + "&key=" + secret;

        // 4. MD5 hash
        return crypto.createHash("md5")
            .update(stringToSign)
            .digest("hex");
    }

    MERCHANT1 = async (merchant, amount, user_id) => {
        try {
            const orderNo = await this.commonHelper.generateDepositOrderNo();
            const ts = Math.floor(Date.now() / 1000);
            const body = {
                app_id: merchant.app_id,
                code: merchant.app_code,
                ts: ts,
                order_no: `SH${orderNo}`,
                amount: amount,
                notify: this.notifyUrl,
                redirect: '',
                subject: `充值: ${amount} 元`,
                user_id: user_id,
                user_ip: '',
            };
            const sign = this.CREATE_SIGN(body, merchant.secret);
            body.sign = sign;

            return body;
        } catch (error) {
            errLogger(`[MERCHANT1] ${error.stack}`);
            return null;
        }
    }
}

module.exports = Controller