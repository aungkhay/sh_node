const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const { User, GoldAppreciationPackage, GoldAppreciationPackageHistory, db, GoldAppreciationPackageEarn, GoldAppreciationPackageBonuses, CashFlow } = require('../../models');
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
            const packages = await GoldAppreciationPackage.findAll({});

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', packages);
        } catch (err) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/gold_appreciation_packages/`;

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

                const pkg = await GoldAppreciationPackage.findByPk(req.params.id);
                if (!pkg) {
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/gold_appreciation_packages/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/gold_appreciation_packages/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await pkg.update({ cover_image: `/uploads/gold_appreciation_packages/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[GoldAppreciationPackage][UPLOAD]: ${error.stack}`);
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

            const { product_name, price, period, reserve_earn, release_reserve_earn_at, gold_appreciation_earn, gold_appreciation_earn_count, is_release_authorize_letter, purchase_limit, quantity_limit, total_quantity, description, buy_one_get_quantity,  } = req.body;
            const newPackage = await GoldAppreciationPackage.create({
                product_name: product_name,
                price: price,
                period: period,
                reserve_earn: reserve_earn,
                release_reserve_earn_at: release_reserve_earn_at,
                gold_appreciation_earn: gold_appreciation_earn,
                gold_appreciation_earn_count: gold_appreciation_earn_count,
                is_release_authorize_letter: is_release_authorize_letter,
                purchase_limit: purchase_limit,
                quantity_limit: quantity_limit,
                total_quantity: total_quantity,
                description: description,
                buy_one_get_quantity: buy_one_get_quantity,
                tag: req.body.tag ? req.body.tag.join('|') : '',
            });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '创建成功', newPackage);

        } catch (error) {
            errLogger(`[GoldAppreciationPackage][CREATE]: ${error.stack}`);
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

            const pkg = await GoldAppreciationPackage.findByPk(req.params.id);
            if (!pkg) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const { product_name, price, period, reserve_earn, release_reserve_earn_at, gold_appreciation_earn, gold_appreciation_earn_count, is_release_authorize_letter, purchase_limit, quantity_limit, total_quantity, description, buy_one_get_quantity, status } = req.body;
            await pkg.update({
                product_name: product_name,
                price: price,
                period: period,
                reserve_earn: reserve_earn,
                release_reserve_earn_at: release_reserve_earn_at,
                gold_appreciation_earn: gold_appreciation_earn,
                gold_appreciation_earn_count: gold_appreciation_earn_count,
                is_release_authorize_letter: is_release_authorize_letter,
                purchase_limit: purchase_limit,
                quantity_limit: quantity_limit,
                total_quantity: total_quantity,
                description: description,
                buy_one_get_quantity: buy_one_get_quantity,
                status: status,
                tag: req.body.tag ? req.body.tag.join('|') : '',
            });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', pkg);
        } catch (error) {
            errLogger(`[GoldAppreciationPackage][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    PACKAGE_HISTORY = async (req, res) => {
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
            // 1 => is_returned_earn | 2 => is_returned_price
            const is_returned = req.query.is_returned; 

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
            if (is_returned) {
                if (is_returned == 1) {
                    condition.is_returned_earn = 1;
                } else if (is_returned == 2) {
                    condition.is_returned_price = 1;
                }
            }

            const { count, rows } = await GoldAppreciationPackageHistory.findAndCountAll({
                where: condition,
                include: [
                    {
                        model: User,
                        where: userCondition,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number', 'is_internal_account']
                    },
                    {
                        model: GoldAppreciationPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
                offset: offset,
                limit: perPage,
                order: [['createdAt', 'DESC']]
            });

            const totalBought = await GoldAppreciationPackageHistory.sum('price', { where: { ...condition, price: { [Op.gt]: 0 } } }) || 0;
            const boughtCount = await GoldAppreciationPackageHistory.count({ where: { ...condition, price: { [Op.gt]: 0 } } });
            const userBoughtCount = await GoldAppreciationPackageHistory.count({ where: { ...condition, price: { [Op.gt]: 0 } }, distinct: true, col: 'user_id' });

            const internalUserBought = await GoldAppreciationPackageHistory.sum('price', {
                where: {
                    ...condition,
                    '$user.is_internal_account$': 1
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
                history: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '查询成功', data);

        } catch (error) {
            errLogger(`[GoldAppreciationPackage][PACKAGE_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
    
    BONUSES_HISTORY = async (req, res) => {
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
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }

            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }

            const { rows, count } = await GoldAppreciationPackageBonuses.findAndCountAll({
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
                        model: GoldAppreciationPackageHistory,
                        as: 'package_history',
                        attributes: [],
                        include: {
                            model: GoldAppreciationPackage,
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
            errLogger(`[GoldAppreciationPackage][BONUSES_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EARN_HISTORY = async (req, res) => {
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
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (phone) {
                condition.phone_number = phone;
            }

            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }

            const { rows, count } = await GoldAppreciationPackageEarn.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: condition
                    },
                    {
                        model: GoldAppreciationPackageHistory,
                        as: 'package_history',
                        attributes: ['id', 'price']
                    },
                    {
                        model: GoldAppreciationPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
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
            errLogger(`[GoldAppreciationPackage][EARN_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;