const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { User, UserKYC, PaymentMethod, UserCertificate, db, UserBonus, UserRankPoint, RewardRecord, UserLog, Rank, Allowance, Deposit, Withdraw, Config } = require('../../models');
const { errLogger, commonLogger } = require('../../helpers/Logger');
const { encrypt } = require('../../helpers/AESHelper');
const { Op } = require('sequelize');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const PASS_KEY = process.env.PASS_KEY;
const PASS_IV = process.env.PASS_IV;
const PASS_PREFIX = process.env.PASS_PREFIX;
const PASS_SUFFIX = process.env.PASS_SUFFIX;

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
        this.redisHelper = new RedisHelper(app);
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const type = parseInt(req.query.type || 0);
            const phone = req.query.phone || '';
            const status = req.query.status || -1;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const isInternalAccount = req.query.isInternalAccount || 0;
            const politicalVettingStatus = req.query.politicalVettingStatus;
            // const viewChild = req.query.viewChild || 0; // 1 => adjacent child | 2 => all child
            const userId = req.user_id;

            let condition = {};
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (type > 0) {
                condition.type = type;
            }
            if (phone) {
                condition.phone_number = phone;
            }
            if (status >= 0) {
                condition.status = status;
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }
            if (isInternalAccount) {
                condition.is_internal_account = isInternalAccount;
            }
            if (politicalVettingStatus) {
                condition.political_vetting_status = politicalVettingStatus;
            }

            const { rows, count } = await User.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'parent',
                        attributes: ['id', 'name', 'phone_number']
                    },
                    {
                        model: Rank,
                        as: 'rank',
                        attributes: ['id', 'name']
                    }
                ],
                where: condition,
                attributes: [
                    'id', 'type', 'name', 'serial_number', 'phone_number', 'invite_code', 'reserve_fund', 'balance',
                    'referral_bonus', 'masonic_fund', 'rank_allowance', 'freeze_allowance', 'earn', 'gold', 'gold_interest', 'address',
                    'address_status', 'agreement_status', 'rank_point', 'level_up_pay', 'win_per_day', 'status', 'political_vetting_status', 
                    'is_internal_account','profile_picture', 'isActive', 'activedAt', 'contact_info', 'createdAt'
                ],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                users: rows,
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

    KYC_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone || '';
            const status = req.query.status || '';
            const nrc_name = req.query.nrc_name || '';
            const nrc_number = req.query.nrc_number || '';
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }
            let condition = {};
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (status) {
                condition.status = status;
            }
            if (nrc_name) {
                condition.nrc_name = {
                    [Op.like]: `%${nrc_name}%`
                }
            }
            if (nrc_number) {
                condition.nrc_number = nrc_number;
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await UserKYC.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone_number'],
                    where: userCondition
                },
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                kycs: rows,
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

    PAYMENT_METHODS = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone || '';
            const bank_status = req.query.bank_status || '';
            const alipay_status = req.query.alipay_status || '';
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }
            let condition = {};
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (bank_status) {
                condition.bank_status = bank_status;
            }
            if (alipay_status) {
                condition.alipay_status = alipay_status;
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await PaymentMethod.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone_number'],
                    where: userCondition
                },
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                kycs: rows,
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

    CERTIFICATE_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone || '';
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }
            let condition = {}
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await UserCertificate.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone_number'],
                    where: userCondition
                },
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                certificates: rows,
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

    BONUS_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone || '';
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }
            let condition = {}
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await UserBonus.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: User,
                        as: 'from_user',
                        attributes: ['id', 'name', 'phone_number'],
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                bonuses: rows,
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

    RANK_POINT_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone || '';
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }
            let condition = {}
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await UserRankPoint.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'from_user',
                        attributes: ['id', 'name', 'phone_number'],
                    },
                    {
                        model: User,
                        as: 'to_user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                points: rows,
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

    UPDATE_USER_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { status, effected_to_all_child } = req.body;
            const user = await User.findByPk(req.params.id, { attributes: ['id', 'type'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const t = await db.transaction();
            try {
                await user.update({ status: status }, { transaction: t });
                if (status == 0) {
                    await this.redisHelper.deleteKey(user.type == 1 ? `admin_token_${user.id}` : `user_token_${user.id}`);
                }
                if (effected_to_all_child) {
                    const children = await User.findAll({
                        where: {
                            relation: { [Op.like]: `%/${user.id}/%` },
                        },
                        attributes: ['id']
                    });
                    for (const child of children) {
                        await child.update({ status: status }, { transaction: t });
                        await this.redisHelper.deleteKey(child.type == 1 ? `admin_token_${child.id}` : `user_token_${child.id}`);
                    }
                }

                await t.commit();
            } catch (error) {
                console.log(error);
                errLogger(`[User][UPDATE_STATUS]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            // Log
            await this.adminLogger(req, 'User', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[User][UPDATE_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_KYC_STATUS_OLD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { status, remark } = req.body;
            const kyc = await UserKYC.findOne({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'relation'],
                },
                attributes: ['id', 'nrc_name'],
                where: { id: req.params.id, status: 'PENDING' }
            });
            if (!kyc) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            // const lv1_bonus = await this.redisHelper.getValue('referral_bonus_lv1');
            // const lv2_bonus = await this.redisHelper.getValue('referral_bonus_lv2');
            // const lv3_bonus = await this.redisHelper.getValue('referral_bonus_lv3');
            // const lv1_point = await this.redisHelper.getValue('rank_point_lv1');
            // const lv2_point = await this.redisHelper.getValue('rank_point_lv2');
            // const lv3_point = await this.redisHelper.getValue('rank_point_lv3');
            // const bonusArr = [lv1_bonus, lv2_bonus, lv3_bonus];
            // const pointArr = [lv1_point, lv2_point, lv3_point];

            // const relationArr = kyc.user.relation.split('/');
            // const upLevelIds = (relationArr.slice(1, relationArr.length - 1)).reverse().slice(0, 3); // remove first & last empty string (limit to 3 levels)
            
            // /1/2/7/10/12/13/14
            const arr = (kyc.user && kyc.user.relation) ? kyc.user.relation.split("/").filter(v => v).slice(1, -1).map(Number) : [];
            const relArr = arr.reverse(); // [13,12,10,7,2]

            const t = await db.transaction();
            try {
                await kyc.update({ status, remark }, { transaction: t });

                if (status === 'APPROVED') {

                    await User.update({ name: kyc.nrc_name }, {
                        where: { id: kyc.user.id },
                        transaction: t
                    });

                    const rankPoints = [];
                    const parents = await User.findAll({
                        where: {
                            id: { [Op.in]: relArr }
                        },
                        attributes: ['id']
                    });

                        // Points per level
                        const levelAmounts = [10, 5, 1]; // First three levels
                        const defaultAmount = 0.5;       // Remaining levels

                        if (relArr.length > 0) {
                            for (let i = 0; i < relArr.length; i++) {
                                const parentId = relArr[i];
                                const amount = levelAmounts[i] ?? defaultAmount; // Use default if beyond defined levels

                                rankPoints.push({ type: 1, from: kyc.user.id, to: parentId, amount, relation: kyc.user.relation });

                                const parent = parents.find(p => p.id == parentId);
                                if (parent) {
                                    await parent.increment({ rank_point: amount }, { transaction: t });
                                }
                            }

                            // Bulk create all rank points at once
                            if (rankPoints.length > 0) {
                                await UserRankPoint.bulkCreate(rankPoints, { transaction: t });
                            }
                        }
                }

                // if (status === 'APPROVED') {

                //     const upLevelUsers = await User.findAll({
                //         where: {
                //             id: { [Op.in]: upLevelIds }
                //         },
                //         attributes: ['id', 'relation']
                //     });

                //     const bonuses = [];
                //     const rankPoints = [];

                //     for (let index = 0; index < upLevelIds.length; index++) {
                //         const bonus = Number(bonusArr[index]);
                //         const point = Number(pointArr[index]);
                //         if (bonus <= 0 && point <= 0) {
                //             continue;
                //         }

                //         const user = await User.findByPk(upLevelIds[index], { attributes: ['id', 'type'], transaction: t });
                //         if (!user || user.type !== 2) { // only User type can get bonus
                //             continue;
                //         }
                //         await user.increment({ referral_bonus: bonus, rank_point: point }, { transaction: t });

                //         const upLevelUser = upLevelUsers.find(u => u.id == upLevelIds[index]);
                //         if (bonus > 0) {
                //             bonuses.push({
                //                 relation: upLevelUser.relation,
                //                 user_id: upLevelIds[index],
                //                 from_user_id: kyc.user.id,
                //                 amount: bonus
                //             });
                //         }
                //         if (point > 0) {
                //             rankPoints.push({
                //                 type: 1, // KYC
                //                 relation: upLevelUser.relation,
                //                 from: kyc.user.id,
                //                 to: upLevelIds[index],
                //                 amount: point
                //             });
                //         }
                //     }
                //     if (bonuses.length > 0) {
                //         await UserBonus.bulkCreate(bonuses, { transaction: t });
                //     }
                //     if (rankPoints.length > 0) {
                //         await UserRankPoint.bulkCreate(rankPoints, { transaction: t });
                //     }
                // }

                await t.commit();
            } catch (error) {
                errLogger(`[UserKYC][UPDATE_STATUS]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            // Log
            await this.adminLogger(req, 'UserKYC', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[UserKYC][UPDATE_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_KYC_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { status, remark } = req.body;
            const kyc = await UserKYC.findOne({
                attributes: ['id', 'nrc_name', 'relation', 'user_id', 'status'],
                where: { id: req.params.id, status: 'PENDING' }
            });
            if (!kyc) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const t = await db.transaction();
            try {
                await kyc.update({ status, remark }, { transaction: t });

                if (status === 'APPROVED') {
                    // update user name first to avoid later failures when relation is missing
                    await User.update({ name: kyc.nrc_name }, {
                        where: { id: kyc.user_id },
                        transaction: t
                    });

                    let lv1_bonus = await this.redisHelper.get_referral_bonus_lv(1);
                    let lv2_bonus = await this.redisHelper.get_referral_bonus_lv(2);
                    let lv3_bonus = await this.redisHelper.get_referral_bonus_lv(3);
                    const bonusArr = [lv1_bonus, lv2_bonus, lv3_bonus];
                    commonLogger(`[UserKYC][UPDATE_STATUS] Referral Bonus Settings: LV1=${lv1_bonus}, LV2=${lv2_bonus}, LV3=${lv3_bonus}`);

                    const relationArr = kyc.relation ? kyc.relation.split('/') : [];
                    const upLevelIds = relationArr.length > 0 ? (relationArr.slice(1, relationArr.length - 1)).reverse().slice(0, 3) : [];
                    const bonuses = [];
                    commonLogger(`[UserKYC][UPDATE_STATUS] Uplines: ${upLevelIds.join(',')}`);

                    if (upLevelIds.length > 0) {
                        const upLevelUsers = await User.findAll({
                            where: {
                                id: { [Op.in]: upLevelIds }
                            },
                            attributes: ['id', 'relation', 'type'],
                            transaction: t,
                            lock: t.LOCK.UPDATE
                        });

                        for (let index = 0; index < upLevelIds.length; index++) {
                            const bonus = Number(bonusArr[index]);
                            if (bonus <= 0) {
                                continue;
                            }
                            const upLevelUser = upLevelUsers.find(u => u.id == upLevelIds[index]);
                            if (!upLevelUser || upLevelUser.type !== 2) { // only User type can get bonus
                                continue;
                            }
                            commonLogger(`[UserKYC][UPDATE_STATUS] Granting bonus ${bonus} to UserID: ${upLevelUser.id}`);
                            await upLevelUser.increment({ referral_bonus: bonus }, { transaction: t });
                            bonuses.push({
                                relation: upLevelUser.relation,
                                user_id: upLevelUser.id,
                                from_user_id: kyc.user_id,
                                amount: bonus
                            });
                        }
                        if (bonuses.length > 0) {
                            await UserBonus.bulkCreate(bonuses, { transaction: t });
                        }
                    }
                }

                await t.commit();
            } catch (error) {
                errLogger(`[UserKYC][UPDATE_STATUS]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            // Log
            await this.adminLogger(req, 'UserKYC', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[UserKYC][UPDATE_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    APPROVED_MULTIPLE_KYC = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { ids } = req.body;
            const t = await db.transaction();
            try {
                for (const id of ids) {
                    const kyc = await UserKYC.findOne({
                        attributes: ['id', 'nrc_name', 'relation', 'user_id', 'status'],
                        where: { id: id, status: 'PENDING' }
                    });
                    if (!kyc) {
                        continue;
                    }
                    await kyc.update({ status: 'APPROVED' }, { transaction: t });

                    // update user name first to avoid failures if relation is missing
                    await User.update({ name: kyc.nrc_name }, {
                        where: { id: kyc.user_id },
                        transaction: t
                    });

                    let lv1_bonus = await this.redisHelper.get_referral_bonus_lv(1);
                    let lv2_bonus = await this.redisHelper.get_referral_bonus_lv(2);
                    let lv3_bonus = await this.redisHelper.get_referral_bonus_lv(3);
                    const bonusArr = [lv1_bonus, lv2_bonus, lv3_bonus];
                    commonLogger(`[UserKYC][APPROVED_MULTIPLE_KYC] Referral Bonus Settings: LV1=${lv1_bonus}, LV2=${lv2_bonus}, LV3=${lv3_bonus}`);

                    const relationArr = kyc.relation.split('/');
                    const upLevelIds = relationArr.length > 0 ? (relationArr.slice(1, relationArr.length - 1)).reverse().slice(0, 3) : [];
                    const bonuses = [];
                    commonLogger(`[UserKYC][APPROVED_MULTIPLE_KYC] Uplines: ${upLevelIds.join(',')}`);

                    if (upLevelIds.length > 0) {
                        const upLevelUsers = await User.findAll({
                            where: {
                                id: { [Op.in]: upLevelIds }
                            },
                            attributes: ['id', 'relation', 'type'],
                            transaction: t,
                            lock: t.LOCK.UPDATE
                        });

                        for (let index = 0; index < upLevelIds.length; index++) {
                            const bonus = Number(bonusArr[index]);
                            if (bonus <= 0) {
                                continue;
                            }
                            const upLevelUser = upLevelUsers.find(u => u.id == upLevelIds[index]);
                            if (!upLevelUser || upLevelUser.type !== 2) { // only User type can get bonus
                                continue;
                            }
                            commonLogger(`[UserKYC][APPROVED_MULTIPLE_KYC] Granting bonus ${bonus} to UserID: ${upLevelUser.id}`);
                            await upLevelUser.increment({ referral_bonus: bonus }, { transaction: t });
                            bonuses.push({
                                relation: upLevelUser.relation,
                                user_id: upLevelUser.id,
                                from_user_id: kyc.user_id,  
                                amount: bonus
                            });
                        }

                        if (bonuses.length > 0) {
                            await UserBonus.bulkCreate(bonuses, { transaction: t });
                        }
                    }
                }
                await t.commit();
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
            } catch (error) {
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[UserKYC][APPROVED_MULTIPLE_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DENIED_MULTIPLE_KYC = async (req, res) => {
        try {
            const err = validationResult(req);  
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { ids } = req.body;
            await UserKYC.update({ status: 'DENIED' }, {
                where: {
                    id: { [Op.in]: ids },
                    status: 'PENDING'
                }
            });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[UserKYC][DENIED_MULTIPLE_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_KYC = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { nrc_name, nrc_number } = req.body;
            const kyc = await UserKYC.findByPk(req.params.id, { attributes: ['id', 'user_id'] });
            if (!kyc) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            await kyc.update({ nrc_name, nrc_number });
            await User.update({ name: nrc_name }, { where: { id: kyc.user_id } });

            // Log
            await this.adminLogger(req, 'UserKYC', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[UserKYC][UPDATE_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE_KYC = async (req, res) => {
        try {
            const kyc = await UserKYC.findOne({
                attributes: ['id', 'user_id', 'nrc_name', 'nrc_number', 'relation'],
                where: { id: req.params.id }
            });
            if (!kyc) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const t = await db.transaction();
            try {
                // Referral bonus settings [推荐金]
                let lv1_bonus = await this.redisHelper.get_referral_bonus_lv(1); // 10
                let lv2_bonus = await this.redisHelper.get_referral_bonus_lv(2); // 5
                let lv3_bonus = await this.redisHelper.get_referral_bonus_lv(3); // 1
                const bonusArr = [lv1_bonus, lv2_bonus, lv3_bonus];
                commonLogger(`[UserKYC][DELETE_KYC] Referral Bonus Settings: LV1=${lv1_bonus}, LV2=${lv2_bonus}, LV3=${lv3_bonus}`);
                
                const relationArr = kyc.relation ? kyc.relation.split('/') : [];
                const upLevelIds = relationArr.length > 0 ? (relationArr.slice(1, relationArr.length - 1)).reverse().slice(0, 3) : [];
                const bonuses = [];
                commonLogger(`[UserKYC][DELETE_KYC] Uplines: ${upLevelIds.join(',')}`);

                if (upLevelIds.length > 0) {
                    const upLevelUsers = await User.findAll({
                        where: {
                            id: { [Op.in]: upLevelIds }
                        },
                        attributes: ['id', 'name', 'phone_number', 'relation', 'type'],
                        transaction: t,
                        lock: t.LOCK.UPDATE
                    });

                    for (let index = 0; index < upLevelIds.length; index++) {
                        const bonus = Number(bonusArr[index]);
                        if (bonus <= 0) {
                            continue;
                        }
                        const upLevelUser = upLevelUsers.find(u => u.id == upLevelIds[index]);
                        if (!upLevelUser || upLevelUser.type !== 2) { // only User type
                            continue;
                        }
                        commonLogger(`[UserKYC][DELETE_KYC] Remove Bonus ${bonus} from UserID: ${upLevelUser.id}`);
                        await upLevelUser.increment({ referral_bonus: -bonus }, { transaction: t });
                        bonuses.push({
                            relation: upLevelUser.relation,
                            user_id: upLevelUser.id,
                            from_user_id: kyc.user_id,
                            amount: -bonus,
                            description: `因下线用户KYC信息被删除，扣除推荐金`
                        });
                    }
                }
                if (bonuses.length > 0) {
                    await UserBonus.bulkCreate(bonuses, { transaction: t });
                }

                await kyc.destroy({ force: true, transaction: t }); // force: true, delete permanently
                await t.commit();
            } catch (error) {
                errLogger(`[UserKYC][DELETE_KYC]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            // Attach info for logging
            req.body = req.body || {}
            req.body.user_id = kyc.user_id
            req.body.nrc_name = kyc.nrc_name
            req.body.nrc_number = kyc.nrc_number
            req.body.relation = kyc.relation
            
            // Log
            await this.adminLogger(req, 'UserKYC', 'delete');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[UserKYC][DELETE_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_BANK = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { bank_card_name, bank_card_number, bank_card_phone_number, open_bank_name } = req.body;
            const bank = await PaymentMethod.findByPk(req.params.id, { attributes: ['id', 'bank_status'] });
            if (!bank) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            // if (bank.bank_status === 'APPROVED') {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '银行信息已审核通过，无法更新', {});
            // }
            await bank.update({ bank_card_name, bank_card_number, bank_card_phone_number, open_bank_name }); 
            // Log
            await this.adminLogger(req, 'PaymentMethod', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[PaymentMethod][UPDATE_BANK]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_ALIPAY = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { ali_account_name, ali_account_number } = req.body;
            const bank = await PaymentMethod.findByPk(req.params.id, { attributes: ['id', 'alipay_status'] });
            if (!bank) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            // if (bank.alipay_status === 'APPROVED') {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付宝信息已审核通过，无法更新', {});
            // }
            await bank.update({ ali_account_name, ali_account_number });
            // Log
            await this.adminLogger(req, 'PaymentMethod', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[PaymentMethod][UPDATE_ALIPAY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_BANK_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const bank = await PaymentMethod.findByPk(req.params.id, { attributes: ['id'] });
            if (!bank) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const { status, remark } = req.body;
            await bank.update({ bank_status: status, bank_remark: remark });

            // Log
            await this.adminLogger(req, 'PaymentMethod', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[PaymentMethod][UPDATE_BANK_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_ALI_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const bank = await PaymentMethod.findByPk(req.params.id, { attributes: ['id'] });
            if (!bank) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const { status, remark } = req.body;
            await bank.update({ alipay_status: status, ali_remark: remark });

            // Log
            await this.adminLogger(req, 'PaymentMethod', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '未找到信息', {});
        } catch (error) {
            errLogger(`[PaymentMethod][UPDATE_ALI_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_WIN_WHITELIST = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { win_per_day } = req.body;
            const user = await User.findOne({
                where: { id: req.params.id, type: 2 },
                attributes: ['id']
            });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            await user.update({ win_per_day: win_per_day });

            // Log
            await this.adminLogger(req, 'User', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[User][UPDATE_WIN_WHITELIST]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHANGE_PASSWORD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { login_password, password } = req.body;

            const userId = req.params.id;
            const user = await User.findByPk(userId, { attributes: ['id', 'password'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const authId = req.user_id;
            if (authId !== 1 && userId == 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '无法修改超级管理员密码', {});
            }

            const auth = await User.findByPk(authId, { attributes: ['id', 'password', 'type'] });
            // const encLoginPassword = encrypt(PASS_PREFIX + login_password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            // if (encLoginPassword !== auth.password) {
            //     const passwordError = { field: 'login_password', msg: '登录密码不正确' };
            //     return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [passwordError]);
            // }

            const encNewPassword = encrypt(PASS_PREFIX + password + PASS_SUFFIX, PASS_KEY, PASS_IV);
            await user.update({ password: encNewPassword });

            // make user logout by deleting token in Redis
            await this.redisHelper.deleteKey(user.type == 1 ? `admin_token_${user.id}` : `user_token_${user.id}`);

            // Log
            await this.adminLogger(req, 'User', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '修改密码成功', {});
        } catch (error) {
            errLogger(`[User][CHANGE_PASSWORD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_AGREEMENT_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const user = await User.findByPk(req.params.id, { attributes: ['id', 'relation', 'agreement_status', 'masonic_fund'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            if (user.agreement_status == 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '已通过', {});
            }

            const { agreement_status } = req.body;

            const t = await db.transaction();
            try {
                let political_vetting_status = '';

                if (agreement_status === 'APPROVED') {
                    political_vetting_status = 'APPROVED';

                    // /1/2/7/10/12/13/14
                    const arr = user.relation.split("/").filter(v => v).slice(1, -1).map(Number); // [2,7,10,12,13]
                    const relArr = arr.reverse(); // [13,12,10,7,2]

                    const rankPoints = [];
                    const parents = await User.findAll({
                        where: {
                            id: { [Op.in]: relArr }
                        },
                        attributes: ['id']
                    });

                    // Points per level
                    const levelAmounts = [90, 45, 9]; // First three levels
                    const defaultAmount = 4.5;       // Remaining levels

                    for (let i = 0; i < relArr.length; i++) {
                        const parentId = relArr[i];
                        const amount = levelAmounts[i] ?? defaultAmount; // Use default if beyond defined levels

                        rankPoints.push({ type: 3, from: user.id, to: parentId, amount, relation: user.relation });

                        const parent = parents.find(p => p.id == parentId);
                        if (parent) {
                            await parent.increment({ rank_point: amount }, { transaction: t });
                        }
                    }

                    // Bulk create all rank points at once
                    if (rankPoints.length > 0) {
                        await UserRankPoint.bulkCreate(rankPoints, { transaction: t });
                    }

                    // Give 20g of gold coupon
                    const now = new Date();
                    const validUntil = new Date(now);
                    validUntil.setMonth(validUntil.getMonth() + 3);
                    await RewardRecord.create({
                        user_id: user.id,
                        relation: user.relation,
                        reward_id: 7, // 上合战略储备黄金券
                        amount: 20,
                        is_used: 0,
                        validedAt: validUntil,
                        from_where: `通过协议 获得上合战略储备黄金券`
                    }, { transaction: t });
                }

                let obj = { agreement_status: agreement_status }
                if (political_vetting_status) {
                    obj.political_vetting_status = political_vetting_status;
                }
                await user.update(obj, { transaction: t });
                
                await t.commit();
                
            } catch (error) {
                errLogger(`[UPDATE_AGREEMENT_STATUS]: ${error.stack}`);
                console.log(error);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '操作失败', {});
            }

            // Log
            await this.adminLogger(req, 'User', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[User][UPDATE_AGREEMENT_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_POLITICAL_VETTING_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const user = await User.findByPk(req.params.id, { attributes: ['id', 'political_vetting_status'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            if (user.political_vetting_status == 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '已通过', {});
            }

            await user.update({ political_vetting_status: req.body.political_vetting_status });

            // Log
            await this.adminLogger(req, 'User', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[User][UPDATE_POLITICAL_VETTING_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SET_TO_INTERNAL_ACCOUNT = async (req, res) => {
        try {
            const user = await User.findByPk(req.params.id, { attributes: ['id', 'is_internal_account'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到账号', {});
            }
            if (user.is_internal_account == 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '已设置为内部员工', {});
            }

            const t = await db.transaction();
            try {
                await user.update({ is_internal_account: 1 }, { transaction: t });
                await User.update({ top_account_id: user.id }, {
                    where: {
                        relation: { [Op.like]: `%/${user.id}/%` },
                        top_account_id: null
                    },
                    transaction: t
                });
                await t.commit();
            } catch (error) {
                console.log(error);
                errLogger(`[User][SET_TO_INTERNAL_ACCOUNT]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            // Log
            await this.adminLogger(req, 'User', 'set_internal_account');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '设置为内部员工成功', {});
        } catch (error) {
            errLogger(`[User][SET_TO_INTERNAL_ACCOUNT]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHILD_SUMMARY = async (req, res) => {
        try {
            const phone = req.query.phone || '';
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            const user = await User.findOne({ where: { phone_number: phone }, attributes: ['id'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const condition = {
                relation: {
                    [Op.like]: `%/${user.id}/%`
                }
            }

            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }
            console.log(startTime,endTime)

            const registerCount = await User.count({ 
                where: {
                    id : { [Op.ne]: user.id },
                    ...condition
                } 
            });

            const kycCount = await UserKYC.count({ 
                where: { 
                    status: 'APPROVED', 
                    user_id : { [Op.ne]: user.id },
                    ... condition
                } 
            });

            const loginCount = await UserLog.count({
                where: {
                    user_id : { [Op.ne]: user.id },
                    ...condition
                } 
            });

            let rawQuery = '';
            if(startTime && endTime) {
                rawQuery = 'AND createdAt BETWEEN "'.concat(startTime).concat('" AND "').concat(endTime).concat('"');
            }

            const [result] = await db.query(`
                SELECT COUNT(DISTINCT DATE(createdAt)) AS totalCount
                FROM reward_records
                WHERE user_id != ${user.id}
                AND relation LIKE '%/${user.id}/%'
                ${rawQuery}
            `);

            delete condition.createdAt;

            const activeCount = await User.count({
                where: {
                    isActive: 1,
                    ... condition
                }
            });

            const total_personal_deposit = await Deposit.sum('amount', {
                where: { user_id: user.id, status: 1 }
            }) || 0;

            const total_persional_withdraw = await Withdraw.sum('amount', {
                where: { user_id: user.id, status: 1 }
            }) || 0;

            const total_team_deposit = await Deposit.sum('amount', {
                where: {
                    status: 1,
                    relation: { [Op.like]: `%/${user.id}/%` }
                }
            }) || 0;

            const total_team_withdraw = await Withdraw.sum('amount', {
                where: {
                    status: 1,
                    relation: { [Op.like]: `%/${user.id}/%` }
                }
            }) || 0;

            const data = {
                total_register: parseInt(registerCount || 0),
                total_verified_kyc: parseInt(kycCount || 0),
                total_logged_in: parseInt(loginCount || 0),
                total_actived: parseInt(activeCount || 0),
                total_sign: parseInt(result.length > 0 ? result[0].totalCount : 0),
                total_personal_deposit: parseFloat(total_personal_deposit),
                total_persional_withdraw: parseFloat(total_persional_withdraw),
                total_team_deposit: parseFloat(total_team_deposit),
                total_team_withdraw: parseFloat(total_team_withdraw)
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);

        } catch (error) {
            errLogger(`[User][CHILD_SUMMARY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SUPERIOR_INTERNAL_ACCOUNT = async (req, res) => {
        try {
            const userId = req.params.id;

            const user = await User.findByPk(userId, { attributes: ['id', 'relation', 'parent_id'] });
            const relArr  = user.relation.split('/').filter(id => id);
            const superiorIds = (relArr.slice(0, -1)).reverse();

            let recent_internal_superior = null;
            for (const id of superiorIds) {
                const superior = await User.findOne({
                    where: { id, is_internal_account: 1 },
                    attributes: ['id', 'name', 'phone_number', 'invite_code']
                });

                if (superior) {
                    recent_internal_superior = superior;
                    break;
                }
            }

            const parent_superior = await User.findByPk(user.parent_id || 0, {
                attributes: ['id', 'name', 'phone_number', 'invite_code']
            });

            const data = {
                recent_internal_superior,
                parent_superior
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[User][SUPERIOR_INTERNAL_ACCOUNT]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ALLOWANCE_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone || '';
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }

            let condition = {};
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await Allowance.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name'],
                        where: userCondition
                    },
                    {
                        model: Rank,
                        as: 'rank',
                        attributes: ['id', 'name'],
                    }
                ],
                where: condition,
                attributes: ['id', 'amount', 'freeze_amount', 'allowance_rate', 'createdAt', 'updatedAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                allowances: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error)
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHILD_REGISTER_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone || '';

            const user = await User.findOne({ where: { phone_number: phone }, attributes: ['id', 'relation'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const condition = {
                relation: {
                    [Op.like]: `%/${user.id}/%`
                }
            }
            const { rows, count } = await User.findAndCountAll({
                where: condition,
                attributes: [
                    'id', 'type', 'name', 'serial_number', 'phone_number', 'invite_code', 'reserve_fund', 'balance',
                    'referral_bonus', 'masonic_fund', 'rank_allowance', 'freeze_allowance', 'earn', 'gold', 'gold_interest', 'address',
                    'address_status', 'agreement_status', 'rank_point', 'level_up_pay', 'win_per_day', 'status', 'political_vetting_status', 
                    'is_internal_account','profile_picture', 'isActive', 'activedAt', 'createdAt'
                ],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                users: rows,
                meta: { 
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);

        } catch (error) {
            errLogger(`[User][CHILD_REGISTER_LIST]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_WALLET = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { walletType, addOrSubstract, amount } = req.body;
            // addOrSubstract => 1 (add) | 2 (substract)
            
            const user = await User.findByPk(req.params.id, { attributes: ['id', 'reserve_fund', 'balance', 'referral_bonus'] });

            const updateAmount = addOrSubstract == 1 ? parseFloat(amount) : -parseFloat(amount);
            let updateObj = {};
            let walletAmount = 0;
            if (walletType == 1) {
                // 储备金
                updateObj.reserve_fund = updateAmount;
                walletAmount = user.reserve_fund;
            } else if (walletType == 2) {
                // 余额
                updateObj.balance = updateAmount;
                walletAmount = user.balance;
            } else if (walletType == 3) {
                // 推荐金
                updateObj.referral_bonus = updateAmount;
                walletAmount = user.referral_bonus;
            }

            if (addOrSubstract == 2 && parseFloat(amount) > parseFloat(walletAmount)) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '金额不足', {});
            }
            await user.increment(updateObj);

            // Log
            req.body.user_id = req.params.id;
            await this.adminLogger(req, 'User', 'update_wallet');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '操作成功', {});
        } catch (error) {
            errLogger(`[User][UPDATE_WALLET]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_CONTACT_INFO = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { contact_info } = req.body;
            
            await User.update({ contact_info: contact_info }, {
                where: { id: req.params.id }
            });

            // Log
            await this.adminLogger(req, 'User', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[User][UPDATE_CONTACT_INFO]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SETUP_2FA = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { email } = req.body;
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id'] });
            // Must be admin type
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到用户信息', {});
            }

            const secret = speakeasy.generateSecret({
                length: 20,
                name: `SH: ${email}`
            });
            await user.update({ google_2fa_secret: secret.base32 });
            const qrCode = await QRCode.toDataURL(secret.otpauth_url);

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '设置成功', { qrCode, secret: secret.base32 });
        } catch (error) {
            errLogger(`[User][SETUP_2FA]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    VERIFY_2FA = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { token } = req.body;
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'google_2fa_secret'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到用户信息', {});
            }
            const verified = speakeasy.totp.verify({
                secret: user.google_2fa_secret,
                encoding: 'base32',
                token: token,
                window: 1
            });
            if (!verified) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '验证码不正确', {});
            }
            await user.update({ google_2fa_enabled: 1 });
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '验证成功', {});
        } catch (error) {
            errLogger(`[User][VERIFY_2FA]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DISABLE_2FA = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { token } = req.body;
            const userId = req.user_id;

            const user = await User.findByPk(userId, { attributes: ['id', 'google_2fa_secret'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到用户信息', {});
            }

            const verified = speakeasy.totp.verify({
                secret: user.google_2fa_secret,
                encoding: 'base32',
                token: token,
                window: 1
            });
            if (!verified) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '验证码不正确', {});
            }

            await user.update({ google_2fa_enabled: 0, google_2fa_secret: null });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '关闭成功', {});
        } catch (error) {
            errLogger(`[User][DISABLE_2FA]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    FIND_USER = async (req, res) => {
        try {
            const phone = req.query.phone || '';
            const user = await User.findOne({
                where: { phone_number: phone },
                attributes: ['id', 'name']
            });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到用户', {});
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', user);
        } catch (error) {
            errLogger(`[User][FIND_USER]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD_KYC = async (req, res) => {
        try {
            const type = req.params.type;
            if (!['front', 'back', 'hold'].includes(type)) {
                const recaptchaError = { field: 'type', msg: '类型不正确' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            }
            const userId = req.params.id;
            req.uploadDir = `./uploads/kyc/${userId}`;

            const userKYC = await UserKYC.findOne({
                where: { user_id: userId },
                attributes: ['id', 'status']
            })
            if (userKYC) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '实名认证信息已存在', {});
            }

            const upload = require('../../middlewares/UploadImage');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '20MB' });
                    }
                    if (err.code == 'ENOENT') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, 'ENOENT', {});
                    }
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, err.message, {});
                } else if (err) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }

                if (req.file == null) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请选图片', {});
                }

                // Upload to AliOSS
                const dir = `uploads/kyc/${userId}/`;
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/kyc/${userId}/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: `/uploads/kyc/${userId}/${fileName}` });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[UPLOAD_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ADD_KYC = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.params.id;
            const { nrc_name, nrc_number, nrc_front_pic, nrc_back_pic, nrc_hold_pic } = req.body;

            const kycExist = await UserKYC.findOne({ 
                where: { user_id: userId }, 
                attributes: ['id'] 
            });

            if (kycExist) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该身份证号码已存在', {});
            }

            // const dob = this.commonHelper.getDOB(nrc_number);
            const t = await db.transaction();
            try {

                const user = await User.findByPk(userId, {
                    include: {
                        model: UserKYC,
                        as: 'kyc',
                        attributes: ['status']
                    },
                    attributes: ['id', 'relation'],
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });
                if (user.kyc) {
                    if (user.kyc.status === 'PENDING') {
                        throw new Error('实名认证审核中');
                    }
                    if (user.kyc.status === 'APPROVED') {
                        throw new Error('实名认证已通过');
                    }
                }

                const obj = {
                    user_id: userId,
                    relation: user.relation,
                    nrc_name: nrc_name,
                    nrc_number: nrc_number,
                    // dob: dob,
                    nrc_front_pic: nrc_front_pic,
                    nrc_back_pic: nrc_back_pic,
                    nrc_hold_pic: nrc_hold_pic,
                    status: 'APPROVED'
                };

                let kyc = await UserKYC.findOne({ where: { user_id: userId }, attributes: ['id'], transaction: t });
                if (!kyc) {
                    kyc = await UserKYC.create(obj, { transaction: t })
                } else {
                    await kyc.update(obj, { transaction: t });
                }

                await user.update({ name: nrc_name }, { transaction: t });

                // Referral bonus settings [推荐金]
                let lv1_bonus = await this.redisHelper.get_referral_bonus_lv(1); // 10
                let lv2_bonus = await this.redisHelper.get_referral_bonus_lv(2); // 5
                let lv3_bonus = await this.redisHelper.get_referral_bonus_lv(3); // 1
                const bonusArr = [lv1_bonus, lv2_bonus, lv3_bonus];
                commonLogger(`[ADD_KYC] Referral Bonus Settings: LV1=${lv1_bonus}, LV2=${lv2_bonus}, LV3=${lv3_bonus}`);

                const relationArr = user.relation.split('/');
                const upLevelIds = (relationArr.slice(1, relationArr.length - 1)).reverse().slice(0, 3); // remove first & last empty string (limit to 3 levels)
                const bonuses = [];
                commonLogger(`[ADD_KYC] Uplines: ${upLevelIds.join(',')}`);

                const upLevelUsers = await User.findAll({
                    where: {
                        id: { [Op.in]: upLevelIds }
                    },
                    attributes: ['id', 'relation', 'type'],
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                for (let index = 0; index < upLevelIds.length; index++) {
                    const bonus = Number(bonusArr[index]);
                    if (bonus <= 0) {
                        continue;
                    }
                    const upLevelUser = upLevelUsers.find(u => u.id == upLevelIds[index]);
                    if (!upLevelUser || upLevelUser.type !== 2) { // only User type can get bonus
                        continue;
                    }
                    commonLogger(`[ADD_KYC] Granting bonus ${bonus} to UserID: ${upLevelUser.id}`);
                    await upLevelUser.increment({ referral_bonus: bonus }, { transaction: t });
                    bonuses.push({
                        relation: upLevelUser.relation,
                        user_id: upLevelUser.id,
                        from_user_id: user.id,
                        amount: bonus
                    });
                }
                if (bonuses.length > 0) {
                    await UserBonus.bulkCreate(bonuses, { transaction: t });
                }

                await t.commit();
            } catch (error) {
                errLogger(`[ADD_KYC]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.BAD_REQUEST.msg, {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '绑定实名认证成功', {});
        } catch (error) {
            errLogger(`[User][ADD_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;