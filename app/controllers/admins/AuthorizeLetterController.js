const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { AuthorizeLetter, User, AuthorizeLetterHistory } = require('../../models');
const { Op } = require('sequelize');
const AliOSS = require('../../helpers/AliOSS');
const multer = require('multer');
const path = require('path');
const RedisHelper = require('../../helpers/RedisHelper');

class Controller {
    constructor (app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.OSS = new AliOSS();
        this.getOffset = this.commonHelper.getOffset;
        this.redisHelper = new RedisHelper(app);
    }

    INDEX = async (req, res) => {
        try {
            const letters = await AuthorizeLetter.findAll();

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', letters);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/authorize_letters/`;

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

                const letter = await AuthorizeLetter.findByPk(req.params.id);
                if (!letter) {
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/authorize_letters/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/authorize_letters/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await letter.update({ flag: `/uploads/authorize_letters/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[AuthorizeLetter][UPLOAD]: ${error.stack}`);
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

            const id = req.params.id;
            const { title, price, gold_count, content, can_buy, status } = req.body;

            const letter = await AuthorizeLetter.findByPk(id);
            if (!letter) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到授权信信息', {});
            }

            await letter.update({
                title,
                price,
                gold_count,
                content,
                can_buy,
                status,
            });

            await this.redisHelper.deleteKey('member_state_letter');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;
            const letterId = req.query.letterId;
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
            if (letterId) {
                condition.letter_id = letterId;
            }
            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] };
            }

            const { count, rows } = await AuthorizeLetterHistory.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition,
                    },
                    {
                        model: AuthorizeLetter,
                        as: 'letter',
                        attributes: ['id', 'title'],
                    },
                    {
                        model: User,
                        as: 'gold_owner',
                        attributes: ['id', 'name', 'phone_number'],
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