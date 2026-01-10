const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper')
const { errLogger } = require('../../helpers/Logger');
const { Rank, User } = require('../../models');
const multer = require('multer');
const path = require('path');
const AliOSS = require('../../helpers/AliOSS');
const { fn, col } = require('sequelize');
const e = require('express');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new RedisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.OSS = new AliOSS();
    }

    INDEX = async (req, res) => {
        try {
            const ranks = await Rank.findAll({
                attributes: {
                    include: [
                        [fn('COUNT', col('users.id')), 'userCount']
                    ]
                },
                include: [
                    {
                        model: User,
                        as: 'users',
                        attributes: [], // ⚠️ do not fetch user data
                    }
                ],
                group: ['Rank.id']
            });
            const redisRanks = await this.redisHelper.getValue('ranks');
            if(!redisRanks) {
                const newRanks = ranks.map(r => {
                    return { id: r.id, name: r.name, point: r.point, number_of_impeach: r.number_of_impeach }
                }) 
                await this.redisHelper.setValue('ranks', JSON.stringify(newRanks));
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', ranks);
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

            const { name, number_of_impeach, point, allowance, allowance_rate, salary_rate, welcome_message } = req.body;
            const rank = await Rank.findByPk(req.params.id);
            if(!rank) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, this.ResCode.NOT_FOUND.msg, {});
            }
            await rank.update({ name, number_of_impeach, point, allowance, allowance_rate, salary_rate, welcome_message });
            await this.redisHelper.deleteKey('ranks');

            // Log
            await this.adminLogger(req, 'Rank', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[Rank][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/ranks`;

            const rank = await Rank.findByPk(req.params.id, { attributes: ['id'] });
            if(!rank) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

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
                const dir = 'uploads/ranks/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/ranks/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if(success) {
                    await rank.update({ pic: `/uploads/ranks/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[Rank][UPLOAD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller