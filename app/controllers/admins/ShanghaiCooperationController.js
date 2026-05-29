const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const { ShanghaiCooperation, ShanghaiCooperationHistory, User, ShanghaiCooperationEarn, ShanghaiCooperationBonuses, CashFlow } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const AliOSS = require('../../helpers/AliOSS');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
        this.adminLogger = this.commonHelper.adminLogger;
        this.OSS = new AliOSS();
    }

    INDEX = async (req, res) => {
        try {
            const packages = await ShanghaiCooperation.findAll({});

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', packages);
        } catch (err) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/shanghai_cooperation/`;

            const upload = require('../../middlewares/UploadImage');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '5MB' });
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

                const pkg = await ShanghaiCooperation.findByPk(req.params.id);
                if (!pkg) {
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/shanghai_cooperation/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/shanghai_cooperation/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await pkg.update({ cover_image: `/uploads/shanghai_cooperation/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[PolicyPackage][UPLOAD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CREATE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            req.body.tag = req.body.tag ? req.body.tag.join('|') : '';
            await ShanghaiCooperation.create({
                ...req.body,
                perchase_limit: req.body.purchase_limit || 0
            });

            // Log
            await this.adminLogger(req, 'ShanghaiCooperation', 'create');
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '创建成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});   
        }
    }

    UPDATE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const pkg = await ShanghaiCooperation.findByPk(req.params.id);
            if (!pkg) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            req.body.tag = req.body.tag ? req.body.tag.join('|') : '';
            await pkg.update({
                ...req.body,
                perchase_limit: req.body.purchase_limit || 0
            });

            // Log
            await this.adminLogger(req, 'ShanghaiCooperation', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[ShanghaiCooperation][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SHANGHAI_COOPERATION_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;
            const packageId = req.query.packageId;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const is_internal_account = req.query.is_internal_account;

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }
            if (is_internal_account >= 0) {
                userCondition.is_internal_account = is_internal_account;
            }
            if (packageId) {
                condition.package_id = packageId;
            }
            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }

            const { rows, count } = await ShanghaiCooperationHistory.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: ShanghaiCooperation,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const totalBought = await ShanghaiCooperationHistory.sum('price', { where: { ...condition, price: { [Op.gt]: 0 } } }) || 0;
            const boughtCount = await ShanghaiCooperationHistory.count({ where: { ...condition, price: { [Op.gt]: 0 } } });
            const userBoughtCount = await ShanghaiCooperationHistory.count({ where: { ...condition, price: { [Op.gt]: 0 } }, distinct: true, col: 'user_id' });

            const internalUserBought = await ShanghaiCooperationHistory.sum('price', {
                where: {
                    ...condition,
                    '$user.is_internal_account$': true
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: []
                    }
                ]
            }) || 0;
            const externalUserBought = totalBought - internalUserBought;

            const data = {
                total_bought: totalBought,
                bought_count: boughtCount,
                user_bought_count: userBoughtCount,
                internal_user_bought: internalUserBought,
                external_user_bought: externalUserBought,
                packages: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[ShanghaiCooperation][HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SHANGHAI_COOPERATION_EARN_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            let condition = {}
            if (userId != 1) {
                // const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                // condition.relation = { [Op.like]: `${me.relation}/%` }
            }

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }
            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }

            const { rows, count } = await ShanghaiCooperationEarn.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: ShanghaiCooperationHistory,
                        as: 'package_history',
                        attributes: ['id', 'price']
                    },
                    {
                        model: ShanghaiCooperation,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                packages: rows,
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

    SHANGHAI_COOPERATION_BONUS_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }

            const { rows, count } = await ShanghaiCooperationBonuses.findAndCountAll({
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
                        attributes: ['id', 'name', 'phone_number']
                    },
                    {
                        model: ShanghaiCooperationHistory,
                        as: 'package_history',
                        attributes: [],
                        include: {
                            model: ShanghaiCooperation,
                            as: 'package',
                            attributes: ['id', 'product_name']
                        }
                    },
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                packages: rows,
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

    RELEASE_PACKAGE_EARN = async (req, res) => {
        try {
            const id = req.params.id;
            const type = req.params.type; // 类型: 0-共济基金返还, 1-兑换价值返还 2. 本金返还

            const pkgHistory = await ShanghaiCooperationHistory.findByPk(id);
            if (!pkgHistory) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            if (type == 0 && pkgHistory.is_returned_masonic_fund) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该共济基金金额已返还', {});
            }
            if (type == 1 && pkgHistory.is_returned_exchanghe_value) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该兑换价值已返还', {});
            }
            if (type == 2 && pkgHistory.is_returned_price) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该本金已返还', {});
            }

            const t = await db.transaction();
            try {

                const user = await User.findByPk(pkgHistory.user_id, { attributes: ['id', 'relation', 'reserve_fund', 'balance'], transaction: t });
                let releaseAmount = 0;

                if (type == 0) {

                    // 共济基金金额
                    await pkgHistory.update({ is_returned_masonic_fund: true, return_masonic_fund_date: new Date() }, { transaction: t });
                    await user.increment({ masonic_fund: Number(pkgHistory.masonic_fund) }, { transaction: t });
                    releaseAmount = pkgHistory.masonic_fund;

                } else if (type == 1) {
                    // 兑换价值返还
                    await pkgHistory.update({ is_returned_exchanghe_value: true, return_exchange_value_date: new Date() }, { transaction: t });
                    
                    releaseAmount = pkgHistory.exchange_value;

                    if (releaseAmount > 0) {
                        await CashFlow.create({
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 2,
                            model: 'ShanghaiCooperationHistory',
                            type: '上海合作组织-兑换价值返还',
                            amount: pkgHistory.exchange_value,
                            before_amount: user.balance,
                            after_amount: Number(user.balance) + Number(pkgHistory.exchange_value),
                            flow_status: 'IN',
                            description: '兑换价值返还'
                        }, { transaction: t });
                        await user.increment({ balance: Number(pkgHistory.exchange_value) }, { transaction: t });
                    }
                } else if (type == 2) {
                    // 本金返还
                    await pkgHistory.update({ is_returned_price: true, return_price_date: new Date() }, { transaction: t });
                    releaseAmount = pkgHistory.price;

                    if (releaseAmount > 0) {
                        await CashFlow.create({
                            user_id: user.id,
                            relation: user.relation,
                            wallet_type: 2,
                            model: 'ShanghaiCooperationHistory',
                            type: '上海合作组织-本金返还',
                            amount: pkgHistory.price,
                            before_amount: user.balance,
                            after_amount: Number(user.balance) + Number(pkgHistory.price),
                            flow_status: 'IN',
                            description: '本金返还'
                        }, { transaction: t });
                        await user.increment({ balance: Number(pkgHistory.price) }, { transaction: t });
                    }
                }

                if (releaseAmount <= 0) {
                    await t.rollback();
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '返还数量必须大于0', {});
                }

                if (pkgHistory.is_returned_exchange_value && pkgHistory.is_returned_masonic_fund && pkgHistory.is_returned_price) {
                    await pkgHistory.update({ is_returned_all: 1 }, { transaction: t });
                }

                await ShanghaiCooperationEarn.create({
                    user_id: pkgHistory.user_id,
                    relation: user.relation,
                    package_history_id: pkgHistory.id,
                    package_id: pkgHistory.package_id,
                    amount: releaseAmount,
                    type: type
                }, { transaction: t });

                await t.commit();

                // Log
                await this.adminLogger(req, 'ShanghaiCooperationHistory', 'release');

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '返还成功', {});
            } catch (error) {
                await t.rollback();
                errLogger(`[ShanghaiCooperationHistory][RELEASE_PACKAGE_EARN]: ${error.stack}`);
                return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[ShanghaiCooperationHistory][RELEASE_PACKAGE_EARN]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;