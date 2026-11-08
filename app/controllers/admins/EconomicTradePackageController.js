const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const { EconomicTradePackage, EconomicTradePackageHistory, User, EconomicTradePackageBonuses, EconomicTradePackageEarn } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const AliOSS = require('../../helpers/AliOSS');
const RedisHelper = require('../../helpers/RedisHelper');
    
class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
        this.adminLogger = this.commonHelper.adminLogger;
        this.redisHelper = new RedisHelper(app);
        this.OSS = new AliOSS();
    }

    INDEX = async (req, res) => {
        try {
            const packages = await EconomicTradePackage.findAll({});

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', packages);
        } catch (err) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/economic_trade_packages/`;

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

                const pkg = await EconomicTradePackage.findByPk(req.params.id);
                if (!pkg) {
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/economic_trade_packages/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/economic_trade_packages/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await this.redisHelper.deleteKey(`economic_trade_packages`); // Clear cache
                    await pkg.update({ cover_image: `/uploads/economic_trade_packages/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[EconomicTradePackage][UPLOAD]: ${error.stack}`);
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
            await EconomicTradePackage.create(req.body);

            // Log
            await this.adminLogger(req, 'EconomicTradePackage', 'create');
            
            await this.redisHelper.deleteKey(`economic_trade_packages`); // Clear cache
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

            const pkg = await EconomicTradePackage.findByPk(req.params.id);
            if (!pkg) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            req.body.tag = req.body.tag ? req.body.tag.join('|') : '';
            await pkg.update(req.body);

            // Log
            await this.adminLogger(req, 'EconomicTradePackage', 'update');

            await this.redisHelper.deleteKey(`economic_trade_packages`); // Clear cache
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[EconomicTradePackage][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ECONOMIC_TRADE_PACKAGE_HISTORY = async (req, res) => {
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

            const { rows, count } = await EconomicTradePackageHistory.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: EconomicTradePackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const totalBought = await EconomicTradePackageHistory.sum('price', {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: [],
                        where: userCondition
                    }
                ],
                where: { ...condition, price: { [Op.gt]: 0 } } 
            }) || 0;
            const boughtCount = await EconomicTradePackageHistory.count({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: [],
                        where: userCondition
                    }
                ],
                where: { ...condition, price: { [Op.gt]: 0 } } 
            });
            const userBoughtCount = await EconomicTradePackageHistory.count({ where: { ...condition, price: { [Op.gt]: 0 } }, distinct: true, col: 'user_id' });

            const internalUserBought = await EconomicTradePackageHistory.sum('price', {
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
            errLogger(`[EconomicTradePackage][PACKAGE_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ECONOMIC_TRADE_PACKAGE_BONUS_HISTORY = async (req, res) => {
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

            const { rows, count } = await EconomicTradePackageBonuses.findAndCountAll({
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
                        model: EconomicTradePackageHistory,
                        as: 'package_history',
                        attributes: [],
                        include: {
                            model: EconomicTradePackage,
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

    ECONOMIC_TRADE_PACKAGE_EARN_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            let condition = {}
            let userCondition = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (phone) {
                userCondition.phone_number = phone;
            }

            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }

            const { rows, count } = await EconomicTradePackageEarn.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: EconomicTradePackageHistory,
                        as: 'package_history',
                        attributes: ['id', 'price']
                    },
                    {
                        model: EconomicTradePackage,
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
            errLogger(`[EconomicTradePackage][EARN_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;