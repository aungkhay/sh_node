const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { Certificate } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const multer = require('multer');
const path = require('path');
const AliOSS = require('../../helpers/AliOSS');
const { Op } = require('sequelize');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
        this.OSS = new AliOSS();
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const status = req.query.status || 0;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            let condition = {}
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }
            if (status) {
                condition.status = status;
            }

            const { rows, count } = await Certificate.findAndCountAll({
                where: condition,
                order: [['createdAt', 'DESC']],
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

    CREATE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { title, pic, description } = req.body;
            const cert = await Certificate.create({ title, pic, description });

            // Log
            await this.adminLogger(req, 'Certificate', 'create');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '添加成功', { id: cert.id });
        } catch (error) {
            errLogger(`[Certificate][CREATE]: ${error.stack}`);
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

            const { title, pic, description } = req.body;
            const cert = await Certificate.findByPk(req.params.id);
            if (!cert) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到证书', {});
            }

            await cert.update({ title: title, pic: pic, description: description });

            // Log
            await this.adminLogger(req, 'Certificate', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[Certificate][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { status } = req.body;
            const cert = await Certificate.findByPk(req.params.id, { attributes: ['id'] });
            if (!cert) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到证书', {});
            }

            await cert.update({ status: status });

            // Log
            await this.adminLogger(req, 'Certificate', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[Certificate][UPDATE_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/certificates`;

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

                // Upload to AliOSS
                const dir = 'uploads/certificates/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/certificates/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: `/uploads/certificates/${fileName}` });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[Certificate][UPLOAD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE = async (req, res) => {
        try {
            const cert = await Certificate.findByPk(req.params.id, { attributes: ['id'] });
            if (!cert) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到证书', {});
            }

            await cert.destroy();

            // Log
            await this.adminLogger(req, 'Certificate', 'delete');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[Certificate][DELETE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller