const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { errLogger } = require('../../helpers/Logger');
const { Transfer, User, db } = require('../../models');
const { Op } = require('sequelize');
let { validationResult } = require('express-validator');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
        this.adminLogger = this.commonHelper.adminLogger;
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone;
            const walletType = req.query.walletType;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (walletType) {
                // condition.wallet_type = walletType;
                condition[Op.or] = [
                    { from: walletType },
                    { to: walletType }
                ]
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await Transfer.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    where: userCondition,
                    attributes: ['id', 'name']
                },
                where: condition,
                attributes: ['id', 'wallet_type', 'amount', 'from', 'to', 'before_from_amount', 'after_from_amount', 'before_to_amount', 'after_to_amount', 'status', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                transfers: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error)
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
            const transfer = await Transfer.findByPk(req.params.id, {
                where: { 
                    status: 'PENDING',
                    reward_id: { [Op.ne]: null }
                },
                attributes: ['id', 'user_id', 'to', 'amount', 'status']
            });

            if (!transfer) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未找到信息', {});
            }

            if (transfer.status === 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '已通过', {});
            }

            const user = await User.findByPk(transfer.user_id, {
                attributes: ['id', 'balance', 'reserve_fund']
            });

            const t = await db.transaction();
            try {
                await transfer.update({ status }, { transaction: t });
                
                if (status === 'APPROVED') {
                    if (transfer.to == 2) {
                        await user.increment({ balance: transfer.amount }, { transaction: t });
                    } else if (transfer.to == 1) {
                        await user.increment({ reserve_fund: transfer.amount }, { transaction: t });
                    }
                } else {
                    // Denied
                    await user.increment({ referral_bonus: transfer.amount }, { transaction: t });
                }

                await t.commit();

                // Log
                await this.adminLogger(req, 'Transfer', 'update');

                return MyResponse(res, this.ResCode.SUCCESS.code, true, `${ status == 'APPROVED' ? '通过成功' : '拒绝成功' }`, {});
            } catch (error) {
                errLogger(`[TRANSFER][UPDATE_STATUS]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '操作失败', {});
            }
        } catch (error) {
            errLogger(`[TRANSFER][UPDATE_STATUS]: ${error}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;