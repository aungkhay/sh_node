const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../../models');
const { encrypt } = require('../../helpers/AESHelper');
const { errLogger } = require('../../helpers/Logger');
const speakeasy = require('speakeasy');

const PASS_KEY = process.env.PASS_KEY;
const PASS_IV = process.env.PASS_IV;
const TOKEN_KEY = process.env.TOKEN_KEY;
const TOKEN_IV = process.env.TOKEN_IV;
const PASS_PREFIX = process.env.PASS_PREFIX;
const PASS_SUFFIX = process.env.PASS_SUFFIX;
const svgCaptcha = require('svg-captcha');

class Controller {
    constructor (app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new RedisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
    }

    GET_RECAPTCHA = async (req, res) => {
        try {
            const key = uuidv4();
            const captcha = svgCaptcha.create({
                size: 5,               // number length
                noise: 0,              // disturbance lines
                color: false,
                // background: '#cf223300',
                foreground: '#000000',
                fontColor: '#000000',
                charPreset: '0123456789' // 🔥 NUMBER ONLY
            });

            this.redisHelper.setValue(key, captcha.text.toLowerCase(), 300);
            const data = {
                uuid: key,
                image: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHECK_2FA_ENABLED = async (req, res) => {
        try {
            const phone = req.query.phone || '';
            const user = await User.findOne({
                where: { phone_number: phone, type: 1 },
                attributes: ['id', 'google_2fa_enabled']
            });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到用户信息', {});
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '查询成功', { enabled: user.google_2fa_enabled });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    LOGIN = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { phone, password, uuid, verification_code, otp } = req.body;

            // Check recaptcha
            const recapt = await this.redisHelper.getValue(uuid);
            if (!recapt || (recapt && recapt != verification_code.toLocaleLowerCase())) {
                await this.redisHelper.deleteKey(uuid);
                const recaptchaError = { field: 'verification_code', msg: '验证码不正确' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            }

            const user = await User.findOne({ 
                where: { phone_number: phone }, 
                attributes: ['id', 'password', 'status', 'relation', 'login_count', 'google_2fa_enabled', 'google_2fa_secret'] 
            });
            if (!user) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到账号', {});
            }
            if (user.id != 1 && user.status == 0) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '账号已被冻结', {});
            }
            if (user.google_2fa_enabled) {
                if (!otp) {
                    return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [{ field: 'otp', msg: '谷歌验证码不能为空' }]);
                }
                const verified = speakeasy.totp.verify({
                    secret: user.google_2fa_secret,
                    encoding: 'base32',
                    token: otp,
                    window: 1
                });
                if (!verified) {
                    return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [{ field: 'otp', msg: '谷歌验证码错误' }]);
                }
            }

            const encPassword = encrypt(PASS_PREFIX + password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            if (encPassword !== user.password) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '密码错误', {});
            }

            // Create Token
            const tokenPrefix = this.commonHelper.randomString(25);
            const tokenSuffix = this.commonHelper.randomString(25);
            const toEncrypt = JSON.stringify({
                id: user.id,
                type: 1, // Admin
                phone: phone,
                relation: user.relation,
                login_count: user.login_count + 1,
                expire_time: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            });
            const token = encrypt(tokenPrefix + toEncrypt + tokenSuffix, TOKEN_KEY, TOKEN_IV);
            await this.redisHelper.setValue(`admin_token_${user.id}_${user.login_count + 1}`, token, 24 * 60 * 60);
            await this.redisHelper.deleteKey(uuid);
            await user.update({ login_count: user.login_count + 1, last_login_at: new Date() });
            // Log
            await this.adminLogger(req, 'User', 'login');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '登录成功', { token: token });
        } catch (error) {
            errLogger(`[Login]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    PROFILE = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findOne({ 
                where: { id: userId }, 
                attributes: ['id', 'phone_number', 'name', 'type', 'invite_code', 'profile_picture', 'google_2fa_enabled', 'createdAt'] 
            });

            const permissions = await this.commonHelper.getAllPermissions(userId);
            user.dataValues.permissions = permissions;

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', user);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    LOGOUT = async (req, res) => {
        try {
            await this.redisHelper.deleteKey(`admin_token_${req.user_id}`);
            await this.adminLogger(req, 'User', 'logout');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '退出成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller