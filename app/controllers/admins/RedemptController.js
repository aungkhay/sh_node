const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { RedemptCode, User } = require('../../models');
const { Op } = require('sequelize');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.commonHelper.getOffset(page, perPage);
            const phone = req.query.phone;
            const is_used = req.query.is_used || -1;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;
            const type = req.query.type;
            
            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone
            }
            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (is_used > -1) {
                condition.is_used = is_used
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }
            if (type) {
                condition.type = type
            }

            const { rows, count } = await RedemptCode.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone_number'],
                    where: userCondition
                },
                where: condition,
                attributes: ['id', 'code', 'amount', 'is_used', 'used_at', 'type', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                codes: rows,
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

    CREATE_CODE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { phone, amount, redempt_code, type } = req.body;
            const checkAccount = await User.findOne({ where: { phone_number: phone }, attributes: ['id', 'relation'] });
            if (!checkAccount) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到账号', {});
            }

            // const code = this.commonHelper.generateRedemptCode();
            const checkExist = await RedemptCode.findOne({ where: { code: redempt_code }, attributes: ['id'] });
            if (checkExist) {
                return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, '兑换码已存在，请重试', {});
            }

            await RedemptCode.create({
                code: redempt_code,
                user_id: checkAccount.id,
                relation: checkAccount.relation,
                amount: amount,
                type: type
            });

            // Log
            await this.adminLogger(req, 'RedemptCode', 'create');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '兑换码创建成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;