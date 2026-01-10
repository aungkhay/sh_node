const { User, AdminLog, RedemptCode, Deposit, Withdraw } = require('../models');
const { decrypt } = require('../helpers/AESHelper');
const { errLogger } = require('./Logger');

const TOKEN_KEY = process.env.TOKEN_KEY;
const TOKEN_IV = process.env.TOKEN_IV;

class Helper {
    constructor() {
        this.ResCode = require('../configs/ResCode');
    }

    getOffset = (page = 1, perPage = 10) => {
        return (page - 1) * perPage;
    }

    randomString = (length) => {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    randomNumber = (length) => {
        var result = '';
        var characters = '0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    generateSerialNumber = async () => {
        try {
            var check = false;
            var serial_number = '';

            while (check == false) {
                serial_number = `SH${this.randomNumber(12)}`;
                const exist = await User.findOne({ where: { serial_number: serial_number }, attributes: ['id'] });

                if (!exist) {
                    check = true;
                } else {
                    check = false;
                }
            }
            return serial_number;
        } catch (error) {
            return '';
        }
    }

    generateInviteCode = async () => {
        try {
            var check = false;
            var invite_code = '';

            while (check == false) {
                invite_code = this.randomNumber(8);
                const exist = await User.findOne({ where: { invite_code: invite_code }, attributes: ['id'] });

                if (!exist) {
                    check = true;
                } else {
                    check = false;
                }
            }
            return invite_code;
        } catch (error) {
            return '';
        }
    }

    generateRedemptCode = async () => {
        try {
            var check = false;
            var code = '';

            while (check == false) {
                code = this.randomNumber(16);
                const exist = await RedemptCode.findOne({ where: { code: code }, attributes: ['id'] });

                if (!exist) {
                    check = true;
                } else {
                    check = false;
                }
            }
            return code;
        } catch (error) {
            return '';
        }
    }

    generateDepositOrderNo = async () => {
        try {
            var check = false;
            var order_no = '';

            while (check == false) {
                order_no = `SH${this.randomNumber(16)}`;
                const exist = await Deposit.findOne({ where: { order_no: order_no }, attributes: ['id'] });

                if (!exist) {
                    check = true;
                } else {
                    check = false;
                }
            }
            return order_no;
        } catch (error) {
            return '';
        }
    }

    generateWithdrawOrderNo = async () => {
        try {
            var check = false;
            var order_no = '';

            while (check == false) {
                order_no = `SH${this.randomNumber(16)}`;
                const exist = await Withdraw.findOne({ where: { order_no: order_no }, attributes: ['id'] });

                if (!exist) {
                    check = true;
                } else {
                    check = false;
                }
            }
            return order_no;
        } catch (error) {
            return '';
        }
    }

    validateForm = (err) => {
        try {
            let errors = [];

            for (let index = 0; index < err.errors.length; index++) {
                const error = err.errors[index];

                let message = error.msg.msg;
                if (!message) {
                    message = error.msg;
                }
                for (const key in error.msg) {
                    if (Object.hasOwnProperty.call(error.msg, key)) {
                        const msg = error.msg[key];
                        if (key === 'params') {
                            for (const paramKey in msg) {
                                if (Object.hasOwnProperty.call(msg, paramKey)) {
                                    const param = msg[paramKey];
                                    message = message.replace(`%${paramKey}`, param);
                                }
                            }
                        }
                    }
                }

                errors.push({
                    field: error.path,
                    msg: message
                })
            }

            return errors;
        } catch (error) {
            return err;
        }
    }

    formatToken = (token) => {
        var tokenString = '';
        var splitted = token.split(' ');
        if (splitted.length == 2) {
            tokenString = splitted[1];
        } else {
            tokenString = splitted[0];
        }

        return tokenString;
    }

    extractToken = (token) => {
        try {
            const decryptedString = decrypt(token, TOKEN_KEY, TOKEN_IV);
            const jsonString = decryptedString.slice(25, -25);
            const user = JSON.parse(jsonString);

            return user;

        } catch (error) {
            return null;
        }
    }

    getClientIP = (req) => {
        try {
            var ip = req.headers['x-forwarded-for'] ||
                req.ip ||
                req.connection.remoteAddress ||
                req.socket.remoteAddress ||
                req.connection.socket.remoteAddress || '';
            if (ip.indexOf(":") >= 0) {
                ip = ip.split(':')[3]
            }
            return ip;
        } catch (e) {
            return '0:0:0:0';
        }
    }

    adminLogger = async (req, model, type) => {
        try {
            let token, admin;
            const ip = this.getClientIP(req);
            if (type != 'login') {
                token = this.formatToken(req.header.authorization || req.header("authorization"));
                admin = this.extractToken(token);
            } else {
                admin = await User.findOne({ where: { phone_number: req.body.phone }, attributes: ['id', 'relation'] });
            }

            const url = req.originalUrl;
            const body = req.body;
            if (body && body.hasOwnProperty('password')) {
                delete body.password;
            }
            if (body && body.hasOwnProperty('login_password')) {
                delete body.login_password;
            }

            await AdminLog.create({
                relation: admin.relation,
                model: model,
                type: type,
                admin_id: admin.id,
                url: url,
                content: body,
                ip: ip
            });
        } catch (error) {
            errLogger(`[AdminLogger]: ${error.stack}`);
        }
    }
}

module.exports = Helper