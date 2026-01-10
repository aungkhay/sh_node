const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { InheritOwner, User, db } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
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
            const status = req.query.status;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let condition = {}
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }
            if (status) {
                condition.status = status;
            }

            const { rows, count } = await InheritOwner.findAndCountAll({
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                inherits: rows,
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

    UPDATE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { status } = req.body;
            const inherit = await InheritOwner.findByPk(req.params.id, { attributes: ['id', 'user_id', 'status'] });
            if (!inherit) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            if (inherit.satus === 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '转让继承已通过', {});
            }
            if (inherit.status === 'DENIED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '转让继承已被拒绝', {});
            }

            const user = await User.findByPk(inherit.user_id, { attributes: ['id'] });
            if (status === 'APPROVED') {
                await inherit.update({ status });
            } else {
                // Cancel => Unlock account
                const t = await db.transaction();
                try {
                    await inherit.update({ status }, { transaction: t });
                    await user.update({ status: 1 }, { transaction: t });
                    await t.commit();
                } catch (error) {
                    await t.rollback();
                    errLogger(`[InheritOwner][UPDATE]: ${error.stack}`);
                    return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
                }
            }

            // Log
            await this.adminLogger(req, 'InheritOwner', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '操作成功', {});
        } catch (error) {
            errLogger(`[InheritOwner][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller