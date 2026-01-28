const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { db, User, UserKYC, PaymentMethod, Rank, UserLog, UserRankPoint, RewardRecord } = require('../../models');
const { encrypt } = require('../../helpers/AESHelper');
const { v4: uuidv4, validate: uuidValidate, version: uuidVersion } = require('uuid');
const { commonLogger, errLogger } = require('../../helpers/Logger');
const { Op } = require('sequelize');
const svgCaptcha = require('svg-captcha');

const PASS_KEY = process.env.PASS_KEY;
const PASS_IV = process.env.PASS_IV;
const TOKEN_KEY = process.env.TOKEN_KEY;
const TOKEN_IV = process.env.TOKEN_IV;
const PASS_PREFIX = process.env.PASS_PREFIX;
const PASS_SUFFIX = process.env.PASS_SUFFIX;

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.redisHelper = new RedisHelper(app);
    }

    GET_RECAPTCHA = async (req, res) => {
        const lockKey = `lock:get_recaptcha:${req.ip}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

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
                
            // const recaptcha = this.redisHelper.randomNumber(5);
            this.redisHelper.setValue(key, captcha.text.toLowerCase(), 300);
            const data = {
                uuid: key,
                image: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);

            // res.setHeader('Content-Type', 'image/svg+xml');
            // res.setHeader('Cache-Control', 'no-store');
            // return res.status(200).send(captcha.data);
            
        } catch (error) {
            errLogger(`[GET_RECAPTCHA]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REGISTER = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { phone, password, invite_code, uuid, verification_code } = req.body;

            // Check recaptcha
            const recapt = await this.redisHelper.getValue(uuid);
            if (!recapt || (recapt && recapt != verification_code.toLocaleLowerCase())) {
                await this.redisHelper.deleteKey(uuid);
                const recaptchaError = { field: 'verification_code', msg: '验证码无效' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            }

            const checkExist = await User.findOne({ where: { phone_number: phone }, attributes: ['id'] });
            if (checkExist) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '账号已存在', {});
            }

            const parent = await User.findOne({ where: { invite_code: invite_code, status: 1 }, attributes: ['id', 'relation', 'top_account_id', 'is_internal_account'] });
            if (!parent) {
                await this.redisHelper.deleteKey(uuid);
                const invideCodeError = { field: 'invite_code', msg: '邀请码无效' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [invideCodeError]);
            }

            const user_invite_code = await this.commonHelper.generateInviteCode();
            const encPassword = encrypt(PASS_PREFIX + password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            const rank = await Rank.findOne({ order: [['id', 'ASC']] });

            let top_account_id = null;
            if (parent.top_account_id) {
                top_account_id = parent.top_account_id;
            } else if (parent.is_internal_account && parent.id != 1) {
                top_account_id = parent.id;
            }

            const obj = {
                type: 2, // User
                name: `SH ${this.commonHelper.randomNumber(5)}`,
                top_account_id: top_account_id,
                phone_number: phone,
                password: encPassword,
                invite_code: user_invite_code.toUpperCase(),
                parent_id: parent.id,
                relation: `-`,
                rank_id: rank.id
            }

            const t = await db.transaction();
            try {
                const user = await User.create(obj, { transaction: t });
                const relation = `${parent.relation}/${user.id}`;
                await user.update({ relation: relation }, { transaction: t });
                await t.commit();

                // Create Token
                const tokenPrefix = this.commonHelper.randomString(25);
                const tokenSuffix = this.commonHelper.randomString(25);
                const toEncrypt = JSON.stringify({
                    id: user.id,
                    type: 2, // User
                    phone: phone,
                    invite_code: user_invite_code,
                    expire_time: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
                });
                const token = encrypt(tokenPrefix + toEncrypt + tokenSuffix, TOKEN_KEY, TOKEN_IV);
                await this.redisHelper.setValue(`user_token_${user.id}`, token, 24 * 60 * 60);
                await this.redisHelper.deleteKey(uuid);

                /* ===============================
                * ✅ UPDATE DOWNLINE LENGTH (NEW)
                * =============================== */
                const parts = parent.relation.split('/').filter(r => r);
                for (let i = 0; i < parts.length; i++) {
                    const uId = parts[i];

                    // depth below this ancestor
                    const depth = parts.length - i;

                    const key = `DOWNLINE_LENGTH_${uId}`;
                    const current = await this.redisHelper.getValue(key);

                    if (!current || depth > Number(current)) {
                        await this.redisHelper.setValue(key, depth);
                    }
                }

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '注册成功', { token: token });
            } catch (error) {
                errLogger(`[Register]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[Register]: ${error.stack}`);
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

            const { phone, password, uuid, verification_code } = req.body;

            // Check recaptcha
            const recapt = await this.redisHelper.getValue(uuid);
            if (!recapt || (recapt && recapt != verification_code.toLocaleLowerCase())) {
                await this.redisHelper.deleteKey(uuid);
                const recaptchaError = { field: 'verification_code', msg: '验证码无效' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            }

            const user = await User.findOne({ 
                where: { phone_number: phone }, 
                attributes: ['id', 'relation', 'password', 'invite_code', 'serial_number', 'status', 'impeach_type'] 
            });
            if (!user) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到账号', {});
            }
            if (user.status == 0 || user.impeach_type == 2) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '账号被冻结', {});
            }

            const encPassword = encrypt(PASS_PREFIX + password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            if (encPassword !== user.password) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '密码不正确', {});
            }

            // Login Log
            const t = await db.transaction();
            try {
                const ip = this.commonHelper.getClientIP(req);
                await UserLog.create({ user_id: user.id, ip: ip, relation: user.relation }, { transaction: t });
                await user.update({ isActive: 1, activedAt: new Date() }, { transaction: t });
                await t.commit();
            } catch (error) {
                await t.rollback();
            }

            // Create Token
            const tokenPrefix = this.commonHelper.randomString(25);
            const tokenSuffix = this.commonHelper.randomString(25);
            const toEncrypt = JSON.stringify({
                id: user.id,
                type: 2, // User
                phone: phone,
                invite_code: user.invite_code,
                serial_number: user.serial_number,
                expire_time: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            });
            const token = encrypt(tokenPrefix + toEncrypt + tokenSuffix, TOKEN_KEY, TOKEN_IV);
            await this.redisHelper.setValue(`user_token_${user.id}`, token, 24 * 60 * 60);
            await this.redisHelper.deleteKey(uuid);

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '登录成功', { token: token });
        } catch (error) {
            errLogger(`[Login]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    LOGOUT = async (req, res) => {
        try {
            await this.redisHelper.deleteKey(`user_token_${req.user_id}`);

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '退出成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    PROFILE = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findByPk(userId, {
                include: [
                    {
                        model: Rank,
                        as: 'rank',
                        attributes: ['id', 'name', 'pic']
                    },
                    {
                        model: UserKYC,
                        as: 'kyc',
                        attributes: ['status']
                    },
                    {
                        model: PaymentMethod,
                        as: 'payment_method',
                        attributes: ['bank_status', 'alipay_status']
                    }
                ],
                where: { status: 1 },
                attributes: [
                    'id', 'name', 'serial_number', 'phone_number', 'invite_code', 'reserve_fund', 
                    'balance', 'referral_bonus', 'masonic_fund', 'address', 'address_status', 
                    'agreement_status', 'rank_allowance', 'freeze_allowance', 'profile_picture',
                    'political_vetting_status', 'rank_id', 'rank_point', 'gold', 'gold_interest',
                    'can_join_spring_event'
                ],
                useMaster: userId % 2 === 0 ? true : false
            });

            // Calculate Rank Percentage
            let ranks = await this.redisHelper.getValue('ranks');
            if(!ranks) {
                ranks = await Rank.findAll({
                    attributes: ['id', 'name', 'point', 'number_of_impeach'],
                    order: [['id', 'ASC']]
                });
                await this.redisHelper.setValue('ranks', JSON.stringify(ranks));
            } else {
                ranks = JSON.parse(ranks);
            }

            // Gold Coupon Count
            const goldCouponCount = await RewardRecord.sum('amount', {
                where: {
                    user_id: userId,
                    reward_id: 7
                },
                useMaster: userId % 2 === 0 ? true : false
            }) || 0;

            let data = {
                ... user.get({ plain: true }),
                can_impeach_count: 0,
                next_rank_percentage: 0,
                next_rank_point: 0,
                gold_count_in_coupon: goldCouponCount
            }

            const currentRankIndex = ranks.findIndex(r => r.id === user.rank_id);
            const lastRank = ranks[ranks.length - 1];
            let nextRankPoint = 0;
            const nextRank = ranks.find(r => r?.point > ranks[currentRankIndex]?.point);
            if (nextRank) {
                nextRankPoint = nextRank.point;
            } else {
                nextRankPoint = lastRank.point;
            }
            data.next_rank_point = nextRankPoint;

            const currentRank = ranks[currentRankIndex];
            // const next_rank_percentage = (100 - (( (nextRankPoint - user.rank_point) / nextRankPoint) * 100)) || 0;
            const next_rank_percentage = user.rank_point / nextRankPoint * 100 || 0;
            if (next_rank_percentage >= 100) {
                data.next_rank_percentage = 100;
            } else {
                data.next_rank_percentage = Number(parseFloat(next_rank_percentage).toFixed(0));
            }
            data.can_impeach_count = currentRank?.number_of_impeach;

            // Update Active
            await user.update({ activedAt: new Date, isActive: 1 });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    MODIFY_PASSWORD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { phone, old_password, new_password, nrc_last_six_digit, uuid, verification_code } = req.body;
            const userId = req.user_id;

            // Check recaptcha
            // const recapt = await this.redisHelper.getValue(uuid);
            // if (!recapt || (recapt && recapt != verification_code.toLocaleLowerCase())) {
            //     await this.redisHelper.deleteKey(uuid);
            //     const recaptchaError = { field: 'verification_code', msg: '验证码无效' };
            //     return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            // }

            const user = await User.findByPk(userId, {
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['nrc_number', 'status']
                },
                attributes: ['id', 'phone_number', 'password'] 
            });
            if (user.phone_number != phone) {
                // await this.redisHelper.deleteKey(uuid);
                const phoneError = { field: 'phone', msg: '手机号不正确' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [phoneError]);
            }

            // const encOldPassword = encrypt(PASS_PREFIX + old_password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            // if (encOldPassword !== user.password) {
            //     // await this.redisHelper.deleteKey(uuid);
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '密码不正确', {});
            // }

            if (!user.kyc || user.kyc.status != 'APPROVED') {
                // await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请先完成实名认证', {});
            }
            if (!user.kyc.nrc_number.endsWith(nrc_last_six_digit)) {
                // await this.redisHelper.deleteKey(uuid);
                const nrcError = { field: 'nrc_last_six_digit', msg: '身份证后六位不正确' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [nrcError]);
            }

            const encNewPassword = encrypt(PASS_PREFIX + new_password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            await user.update({ password: encNewPassword });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '修改密码成功', {});
        } catch (error) {
            errLogger(`[MODIFY_PASSWORD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    FORGOT_PASSWORD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { phone, nrc_number, new_password, uuid, verification_code } = req.body;

            // Check recaptcha
            const recapt = await this.redisHelper.getValue(uuid);
            if (!recapt || (recapt && recapt != verification_code.toLocaleLowerCase())) {
                await this.redisHelper.deleteKey(uuid);
                const recaptchaError = { field: 'verification_code', msg: '验证码无效' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            }

            const user = await User.findOne({
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['nrc_number']
                },
                where: { phone_number: phone },
                attributes: ['id', 'status']
            });
            if (!user) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到账号', {});
            }
            if (user.status == 0) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '账号被已被冻结', {});
            }
            if (user.kyc.nrc_number != nrc_number) {
                await this.redisHelper.deleteKey(uuid);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '身份证号不正确', {});
            }

            const encNewPassword = encrypt(PASS_PREFIX + new_password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            await user.update({ password: encNewPassword });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '修改密码成功', {});
        } catch (error) {
            errLogger(`[FORGOT_PASSWORD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;