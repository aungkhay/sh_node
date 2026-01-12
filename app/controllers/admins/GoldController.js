const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { GoldPrice, UserGoldPrice, User, Config, GoldInterest, db } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const { Op } = require('sequelize');
let { validationResult } = require('express-validator');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
    }

    GET_GOLD_PRICE_CHANGES = async (req, res) => {
        try {

            const goldConf = await Config.findAll({
                where: {
                    type: {
                        [Op.in]: ['gold_price_changes', 'gold_interest_rate']
                    }
                }
            })

            const percentage = goldConf.find(c => c.type === 'gold_price_changes')?.val || '0';
            const interestRate = goldConf.find(c => c.type === 'gold_interest_rate')?.val || '0';

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { percentage: Number(percentage), rate: Number(interestRate) });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_GOLD_PRICE_CHANGES = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { percentage, rate } = req.body;

            const t = await db.transaction();
            try {
                await Config.update({ val: percentage }, {
                    where: { type: 'gold_price_changes' }
                }, { transaction: t });
                await Config.update({ val: rate }, {
                    where: { type: 'gold_interest_rate' }
                }, { transaction: t });

                await t.commit();
            } catch (error) {
                console.log(error);
                errLogger(`[GOLD_PRICE][UPDATE_GOLD_PRICE_CHANGES_TRANSACTION]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            // Log
            await this.adminLogger(req, 'GoldPrice', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', {});
        } catch (error) {
            errLogger(`[GOLD_PRICE][UPDATE_GOLD_PRICE_CHANGES]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GOLD_PRICE_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            let condition = {}
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await GoldPrice.findAndCountAll({
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                golds: rows,
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

    UPDATE_GOLD_PRICE = async (req, res) => {
        try {
            const gold = await GoldPrice.findByPk(req.params.id, { attributes: ['id'] });
            if (!gold) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const { reserve_price } = req.body;
            await gold.update({ reserve_price });

            // Log
            await this.adminLogger(req, 'GoldPrice', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[UPDATE_GOLD_PRICE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    USER_GOLD_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const type = parseInt(req.query.type || 0); // 0 => All | 1 => Buy | 2 => Sell
            const phone = req.query.phone;
            const userId = req.user_id;

            let condition = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (type > 0) {
                condition.type = type;
            }
            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }

            const { rows, count } = await UserGoldPrice.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name'],
                    where: userCondition
                },
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                histories: rows,
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

    GOLD_INTEREST_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone;
            const userId = req.user_id;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

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
            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }

            const { rows, count } = await GoldInterest.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name'],
                    where: userCondition
                },
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                interests: rows,
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

module.exports = Controller