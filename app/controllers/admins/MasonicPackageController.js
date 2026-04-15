const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const { User, MasonicPackageBonuses } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const MasonicPackageHistory = require('../../models/MasonicPackageHistory');
const MasonicPackageEarn = require('../../models/MasonicPackageEarn');
const MasonicPackage = require('../../models/MasonicPackage');
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
            const packages = await MasonicPackage.findAll({});

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', packages);
        } catch (err) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/masonic_packages/`;

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

                const pkg = await MasonicPackage.findByPk(req.params.id);
                if (!pkg) {
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/masonic_packages/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/masonic_packages/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await pkg.update({ cover_image: `/uploads/masonic_packages/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[MasonicPackage][UPLOAD]: ${error.stack}`);
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

            const pkg = await MasonicPackage.findByPk(req.params.id);
            if (!pkg) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            await pkg.update(req.body);

            // Log
            await this.adminLogger(req, 'MasonicPackage', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[MasonicPackage][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    MASONIC_PACKAGE_HISTORY = async (req, res) => {
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

            const { rows, count } = await MasonicPackageHistory.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: MasonicPackage,
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

    MASONIC_PACKAGE_EARN_HISTORY = async (req, res) => {
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

            const { rows, count } = await MasonicPackageEarn.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: MasonicPackageHistory,
                        as: 'package_history',
                        attributes: ['id', 'price']
                    },
                    {
                        model: MasonicPackage,
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
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    MASONIC_PACKAGE_BONUS_HISTORY = async (req, res) => {
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

            const { rows, count } = await MasonicPackageBonuses.findAndCountAll({
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
                        model: MasonicPackageHistory,
                        as: 'package_history',
                        attributes: [],
                        include: {
                            model: MasonicPackage,
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
            console.log(error)
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;