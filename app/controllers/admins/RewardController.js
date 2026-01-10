const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { errLogger } = require('../../helpers/Logger');
const { RewardType, RewardRecord, User } = require('../../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new RedisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
    }

    REWARD_TYPES = async (req, res) => {
        try {
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', types);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SET_AS_ENERGY_FORUM = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { is_energy_forum } = req.body;
            const type = await RewardType.findByPk(req.params.id);
            if (!type) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            await type.update({ is_energy_forum });

            // Refresh Cache
            await this.redisHelper.deleteKey('reward_types');
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));
            // Log
            await this.adminLogger(req, 'Reward', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[SET_AS_ENERGY_FORUM]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_REWARD_TYPE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const type = await RewardType.findByPk(req.params.id);
            if (!type) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const { total_count, remain_count, range_min, range_max, amount_min, amount_max } = req.body;
            await type.update({ total_count, remain_count, range_min, range_max, amount_min, amount_max });

            // Log
            await this.adminLogger(req, 'Reward', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[REWARD_TYPE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_REWARD_TYPE_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const type = await RewardType.findByPk(req.params.id, { attributes: ['id'] });
            if (!type) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            const { status } = req.body;
            await type.update({ status });

            // Refresh Cache
            await this.redisHelper.deleteKey('reward_types');
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));
            
            // Log
            await this.adminLogger(req, 'Reward', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[UPDATE_REWARD_TYPE_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REWARD_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }
            let condition = {}
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await RewardRecord.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        where: userCondition,
                        attributes: ['name']
                    },
                    {
                        model: RewardType,
                        as: 'reward_type',
                        attributes: ['title']
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                rewards: rows,
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

    REFERRAL_REWARD_SETTINGS = async (req, res) => {
        try {
            let reward = await RewardType.findOne({ where: { id: 8 } });
            let settings = reward.settings ? JSON.parse(reward.settings) : [];
            settings.sort((a, b) => a.range_min - b.range_min);

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', settings);
        } catch (error) {
            errLogger(`[REFERRAL_REWARD_SETTINGS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CREATE_REFERRAL_REWARD_SETTING = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { name, amount, total_count } = req.body;
            let reward = await RewardType.findOne({ where: { id: 8 } });
            let settings = reward.settings ? JSON.parse(reward.settings) : [];
            settings.push({
                id: uuidv4(),
                name,
                amount,
                total_count
            });
            await reward.update({ settings: JSON.stringify(settings) });
            
            // Refresh Cache
            await this.redisHelper.deleteKey('reward_types');
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '创建成功', {});
        } catch (error) {
            errLogger(`[CREATE_REFERRAL_REWARD_SETTING]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_REFERRAL_REWARD_SETTING = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { id } = req.params;
            const { name, amount, total_count } = req.body;
            let reward = await RewardType.findOne({ where: { id: 8 } });
            let settings = reward.settings ? JSON.parse(reward.settings) : [];
            let setting = settings.find(s => s.id === id);
            if (!setting) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            setting.name = name;
            setting.amount = amount;
            setting.total_count = total_count;
            await reward.update({ settings: JSON.stringify(settings) });

            // Refresh Cache    
            await this.redisHelper.deleteKey('reward_types');
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[UPDATE_REFERRAL_REWARD_SETTING]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE_REFERRAL_REWARD_SETTING = async (req, res) => {
        try {
            const { id } = req.params;
            let reward = await RewardType.findOne({ where: { id: 8 } });
            let settings = reward.settings ? JSON.parse(reward.settings) : [];
            settings = settings.filter(s => s.id !== id);
            await reward.update({ settings: JSON.stringify(settings) });

            // Refresh Cache
            await this.redisHelper.deleteKey('reward_types');
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[DELETE_REFERRAL_REWARD_SETTING]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller