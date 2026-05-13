const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { errLogger } = require('../../helpers/Logger');
const { Op } = require('sequelize');
const { Meeting, AttendedMeeting } = require('../../models');
const multer = require('multer');
const path = require('path');
const AliOSS = require('../../helpers/AliOSS');

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

            const { rows, count } = await Meeting.findAndCountAll({
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                meetings: rows,
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

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/meetings/`;

            const upload = require('../../middlewares/UploadImage');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '500MB' });
                    }
                    if (err.code == 'ENOENT') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, 'ENOENT', {});
                    }
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, err.message, {});
                } else if (err) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }

                if (req.file == null) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请选图片或视频', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/meetings/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/meetings/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: `/uploads/meetings/${fileName}` });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[Meeting][UPLOAD]: ${error.stack}`);
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

            const meeting = await Meeting.create(req.body);

            // Log
            await this.adminLogger(req, 'Meeting', 'create');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '创建成功', { meeting });
        } catch (error) {
            errLogger(`[Meeting][CREATE]: ${error.stack}`);
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

            const meeting = await Meeting.findByPk(req.params.id);
            if (!meeting) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '会议不存在', {});
            }
            
            await meeting.update(req.body);

            // Log
            await this.adminLogger(req, 'Meeting', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', { meeting });
        } catch (error) {
            errLogger(`[Meeting][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE = async (req, res) => {
        try {
            const meeting = await Meeting.findByPk(req.params.id);
            if (!meeting) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '会议不存在', {});
            }

            await meeting.destroy();

            // Log
            await this.adminLogger(req, 'Meeting', 'delete');
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[Meeting][DELETE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ATTENDED_MEETINGS = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            const { rows, count } = await AttendedMeeting.findAndCountAll({
                include: {
                    model: Meeting,
                    as: 'meeting',
                    attributes: ['id', 'title', 'start_time', 'is_active']
                },
                order: [['createdAt', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                history: rows,
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
}

module.exports = Controller;