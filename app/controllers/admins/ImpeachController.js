const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { Impeachment, User, db } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const { Op } = require('sequelize');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new RedisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone;
            const type = req.query.type;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let parentCondition = {}
            if (phone) {
                parentCondition.phone_number = phone;
            }
            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }
            if (type) {
                condition.type = type;
            }

            const { rows, count } = await Impeachment.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'parent',
                        where: parentCondition,
                        attributes: ['id', 'name', 'phone_number'],
                    },
                    {
                        model: User,
                        as: 'child',
                        attributes: ['id', 'name', 'phone_number']
                    },
                ],
                where: condition,
                attributes: ['id', 'type', 'status', 'remark', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                impeaches: rows,
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
            const impeach = await Impeachment.findByPk(req.params.id, { attributes: ['id', 'type', 'child_id'] });
            if (!impeach) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const child = await User.findByPk(impeach.child_id, { attributes: ['id'] });

            if (status === 'DENIED') {
                await impeach.update({ status });
            } else {
                // APPROVED
                const t = await db.transaction();
                try {
                    await impeach.update({ status: status }, { transaction: t });
                    if (impeach.type == 2) { // lock account

                        await child.update({ impeach_type: impeach.type, status: 0 }, { transaction: t });
                        await this.redisHelper.deleteKey(`user_token_${child.id}`);

                    } else {

                        await child.update({ impeach_type: impeach.type }, { transaction: t });

                    }
                    await t.commit();
                } catch (error) {
                    await t.rollback();
                    errLogger(`[Impeachment][UPDATE]: ${error.stack}`);
                    return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
                }
            }

            // Log
            this.adminLogger(req, 'Impeachment', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', {});
        } catch (error) {
            errLogger(`[Impeachment][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller