const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const { User, FederalReserveGoldPackage, FederalReserveGoldPackageHistory, db, FederalReserveGoldPackageEarn, FederalReserveGoldPackageBonuses } = require('../../models');
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
            const packages = await FederalReserveGoldPackage.findAll({});

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', packages);
        } catch (err) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/federal_reserve_gold_packages/`;

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

                const pkg = await FederalReserveGoldPackage.findByPk(req.params.id);
                if (!pkg) {
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/federal_reserve_gold_packages/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/federal_reserve_gold_packages/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await pkg.update({ cover_image: `/uploads/federal_reserve_gold_packages/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[FederalReserveGoldPackage][UPLOAD]: ${error.stack}`);
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

            const { product_name, price, period, reserve_earn, personal_gold, masonic_fund, purchase_limit, quantity_limit, total_quantity, description } = req.body;
            const newPackage = await FederalReserveGoldPackage.create({
                product_name: product_name,
                price: price,
                period: period,
                reserve_earn: reserve_earn,
                personal_gold: personal_gold,
                masonic_fund: masonic_fund,
                purchase_limit: purchase_limit,
                quantity_limit: quantity_limit,
                total_quantity: total_quantity,
                description: description,
            });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '创建成功', newPackage);

        } catch (error) {
            errLogger(`[FederalReserveGoldPackage][CREATE]: ${error.stack}`);
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

            const pkg = await FederalReserveGoldPackage.findByPk(req.params.id);
            if (!pkg) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const { product_name, price, period, reserve_earn, personal_gold, masonic_fund, purchase_limit, quantity_limit, total_quantity, description, status } = req.body;
            await pkg.update({
                product_name: product_name,
                price: price,
                period: period,
                reserve_earn: reserve_earn,
                personal_gold: personal_gold,
                masonic_fund: masonic_fund,
                purchase_limit: purchase_limit,
                quantity_limit: quantity_limit,
                total_quantity: total_quantity,
                description: description,
                status: status,
            });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', pkg);
        } catch (error) {
            errLogger(`[FederalReserveGoldPackage][UPDATE]: ${error.stack}`);
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

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }
            if (packageId) {
                condition.package_id = packageId;
            }
            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }

            const { count, rows } = await FederalReserveGoldPackageHistory.findAndCountAll({
                where: condition,
                include: [
                    {
                        model: User,
                        where: userCondition,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number']
                    },
                    {
                        model: FederalReserveGoldPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
                offset: offset,
                limit: perPage,
                order: [['createdAt', 'DESC']]
            });

            const totalBought = await FederalReserveGoldPackageHistory.sum('price', { where: condition }) || 0;
            const boughtCount = await FederalReserveGoldPackageHistory.count({ where: condition });
            const userBoughtCount = await FederalReserveGoldPackageHistory.count({ where: condition, distinct: true, col: 'user_id' });

            const data = {
                total_bought: totalBought,
                bought_count: boughtCount,
                user_bought_count: userBoughtCount,
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
            errLogger(`[FederalReserveGoldPackage][PACKAGE_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    RELEASE_PACKAGE_EARN = async (req, res) => {
        try {
            const id = req.params.id;
            const type = req.params.type; // 类型: 0-储备收益, 1-个人黄金, 2-本金返还, 3-共济基金金额

            const pkgHistory = await FederalReserveGoldPackageHistory.findByPk(id);
            if (!pkgHistory) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            if (type == 0 && pkgHistory.is_returned_earn) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该收益已返还', {});
            }
            if (type == 1 && pkgHistory.is_returned_personal_gold) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该个人黄金已返还', {});
            }
            if (type == 2 && pkgHistory.is_returned_price) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该本金已返还', {});
            }
            if (type == 3 && pkgHistory.is_returned_masonic_fund) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该共济基金金额已返还', {});
            }

            const t = await db.transaction();
            try {

                const user = await User.findByPk(pkgHistory.user_id, { attributes: ['id', 'relation', 'reserve_fund', 'gold'], transaction: t });
                let releaseAmount = 0;
                if (type == 0) {
                    // 储备收益
                    await pkgHistory.update({ is_returned_earn: true, return_earn_date: new Date() }, { transaction: t });
                    await user.increment({ reserve_fund: Number(pkgHistory.reserve_earn) }, { transaction: t });
                    releaseAmount = pkgHistory.reserve_earn;
                } else if (type == 1) {
                    // 个人黄金
                    await pkgHistory.update({ is_returned_personal_gold: true, return_personal_gold_date: new Date() }, { transaction: t });
                    releaseAmount = pkgHistory.personal_gold;
                } else if (type == 2) {
                    // 本金返还
                    await pkgHistory.update({ is_returned_price: true, return_price_date: new Date() }, { transaction: t });
                    await user.increment({ reserve_fund: Number(pkgHistory.price) }, { transaction: t });
                    releaseAmount = pkgHistory.price;
                } else if (type == 3) {
                    // 共济基金金额
                    await pkgHistory.update({ is_returned_masonic_fund: true, return_masonic_fund_date: new Date() }, { transaction: t });
                    await user.increment({ masonic_fund: Number(pkgHistory.masonic_fund) }, { transaction: t });
                    releaseAmount = pkgHistory.masonic_fund;
                }

                if (pkgHistory.is_returned_earn && pkgHistory.is_returned_personal_gold && pkgHistory.is_returned_price && pkgHistory.is_returned_masonic_fund) {
                    await pkgHistory.update({ is_returned_all: 1 }, { transaction: t });
                }

                await FederalReserveGoldPackageEarn.create({
                    user_id: pkgHistory.user_id,
                    relation: user.relation,
                    package_history_id: pkgHistory.id,
                    package_id: pkgHistory.package_id,
                    amount: releaseAmount,
                    type: type
                }, { transaction: t });

                await t.commit();

                // Log
                await this.adminLogger(req, 'FederalReserveGoldPackage', 'release');

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '返还成功', {});
            } catch (error) {
                await t.rollback();
                errLogger(`[FederalReserveGoldPackage][RELEASE_PACKAGE_EARN]: ${error.stack}`);
                return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[FederalReserveGoldPackage][RELEASE_PACKAGE_EARN]: ${error.stack}`);
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

            const { rows, count } = await FederalReserveGoldPackageBonuses.findAndCountAll({
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
                        model: FederalReserveGoldPackageHistory,
                        as: 'package_history',
                        attributes: [],
                        include: {
                            model: FederalReserveGoldPackage,
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
            errLogger(`[FederalReserveGoldPackage][BONUSES_HISTORY]: ${error.stack}`);
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

            const { rows, count } = await FederalReserveGoldPackageEarn.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: condition
                    },
                    {
                        model: FederalReserveGoldPackageHistory,
                        as: 'package_history',
                        attributes: ['id', 'price']
                    },
                    {
                        model: FederalReserveGoldPackage,
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
            errLogger(`[FederalReserveGoldPackage][EARN_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;