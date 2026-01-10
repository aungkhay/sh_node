const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { AdminLog, User } = require('../../models');
const { Op } = require('sequelize');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const type = req.query.type || null;
            const model = req.query.model || null;
            const admin_phone = req.query.admin_phone || null;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let condition = {};
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (type) {
                condition.type = type;
            }
            if (model) {
                condition.model = model;
            }
            let userCondition = {};
            if (admin_phone) {
                userCondition.phone_number = admin_phone;
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await AdminLog.findAndCountAll({
                include: {
                    model: User,
                    as: 'admin',
                    attributes: ['id', 'name', 'phone_number'],
                    where: userCondition
                },
                where: condition,
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
}

module.exports = Controller;