const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { Information } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
            const status = req.query.status;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            let condition = {}
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }
            if (status >= 0) {
                condition.status = status;
            }

            const { rows, count } = await Information.findAndCountAll({
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                informations: rows,
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

            const { title, subtitle, content, pic } = req.body;
            const info = await Information.create({ title, subtitle, content, pic });

            // Log
            this.adminLogger(req, 'Information', 'create');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '添加成功', { id: info.id });
        } catch (error) {
            errLogger(`[Information][CREATE]: ${error.stack}`);
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

            const { title, subtitle, content, pic } = req.body;
            const info = await Information.findByPk(req.params.id);
            if (!info) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            await info.update({ title, subtitle, content, pic });

            // Log
            this.adminLogger(req, 'Information', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[Information][UPDATE]: ${error.stack}`);
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
            const info = await Information.findByPk(req.params.id, { attributes: ['id'] });
            if (!info) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            await info.update({ status: status });

            // Log
            await this.adminLogger(req, 'Information', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[Information][UPDATE_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/informations`;

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
                const dir = 'uploads/informations/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/informations/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: `/uploads/informations/${fileName}` });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[Informations][UPLOAD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE = async (req, res) => {
        try {
            const info = await Information.findByPk(req.params.id, { attributes: ['id', 'pic'] });
            if (!info) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            // Delete File
            if (info.pic != null) {
                const filePath = path.resolve(__dirname, `../../..${info.pic}`);
                try {
                    const dir = 'uploads/informations/';
                    const image = info.pic.split('/');
                    await this.OSS.DELETE(dir, image[3]);
                    fs.accessSync(filePath);
                    fs.unlinkSync(filePath, () => {
                        return commonHelper.MyResponse(res, resConfig.BAD_REQUEST, false, '删除失败！', {});
                    })
                } catch (err) {
                    console.log("DOES NOT exist:", filePath);
                }
            }

            await info.destroy();

            // Log
            await this.adminLogger(req, 'Information', 'delete');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[Information][DELETE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller