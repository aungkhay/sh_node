const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { UserSpringFestivalCheckIn, UserSpringFestivalCheckInLog, User, RewardRecord } = require('../../models');
const { Op } = require('sequelize');
const { errLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
    }

    JOINED_EVENT_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const phone = req.query.phone;
            const userId = req.user_id;

            let condition = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }
            const { rows, count } = await UserSpringFestivalCheckIn.findAndCountAll({
                attributes: ['id', 'total_check_in', 'last_check_in_date', 'is_completed_7', 'is_completed_14', 'is_completed_21', 'createdAt', 'updatedAt'],
                where: condition,
                include: {
                    model: User,
                    as: 'user',
                    where: userCondition,
                    attributes: ['id', 'name', 'phone_number']
                },
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                list: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.error(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHECK_IN_LOGS = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const phone = req.query.phone;
            const userId = req.user_id;

            let condition = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            let userCondition = {};
            if (phone) {
                userCondition.phone_number = phone;
            }
            const { rows, count } = await UserSpringFestivalCheckInLog.findAndCountAll({
                attributes: ['id', 'check_in_date', 'is_repair', 'createdAt', 'updatedAt'],
                where: condition,
                include: {
                    model: User,
                    as: 'user',
                    where: userCondition,
                    attributes: ['id', 'name', 'phone_number']
                },
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                logs: rows,
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

    GIVE_PEPAIR_CARD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { phone } = req.body;
            const user = await User.findOne({ where: { phone_number: phone }, attributes: ['id', 'relation'] });
            if (!user) {
                return MyResponse(res, this.ResCode.USER_NOT_FOUND.code, false, '用户不存在', {});
            }

            await RewardRecord.create({
                user_id: user.id,
                relation: user.relation,
                amount: 1,
                reward_id: 8,
                is_background_added: 1,
                from_where: '后台发放春节活动补签卡',
                is_spring_festival_event: 1,
                check_in_type: 2
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '发放补签卡成功', {});
        } catch (error) {
            errLogger(`[SpringFestivalEventController][GIVE_PEPAIR_CARD] ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;