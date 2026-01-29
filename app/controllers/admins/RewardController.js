const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { errLogger } = require('../../helpers/Logger');
const { RewardType, RewardRecord, User, db } = require('../../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { fn, literal } = require('sequelize');

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
            // Refresh Cache
            await this.redisHelper.deleteKey('reward_types');
            const types = await RewardType.findAll();
            await this.redisHelper.setValue('reward_types', JSON.stringify(types));
            await this.redisHelper.setValue(`REWARD_REMAIN_${type.id}`, remain_count);

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
            const rewardId = req.query.rewardId;
            const isUsed = req.query.isUsed || -1;
            const isBackgroundAdded = req.query.isBackgroundAdded || -1;

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
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
            if (isUsed != -1) {
                condition.is_used = isUsed;
            }
            if (isBackgroundAdded != -1) {
                condition.is_background_added = isBackgroundAdded;
            }
            if (rewardId) {
                condition.reward_id = rewardId;
            }

            const total = await RewardRecord.count({
                include: [
                    {
                        model: User,
                        as: 'user',
                        where: userCondition,
                        attributes: []
                    }
                ],
                where: condition,
            });
            const rows = await RewardRecord.findAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        where: userCondition,
                        attributes: ['id', 'name', 'phone_number']
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
            const countObj = {
                reward1UserCount: 0,
                reward2UserCount: 0,
                reward3UserCount: 0,
                reward4UserCount: 0,
                reward5UserCount: 0,
                reward6UserCount: 0,
                reward7UserCount: 0,
                reward8UserCount: 0,
            }
            for (let i = 1; i <= 8; i++) {
                if (rewardId && Number(rewardId) != i) {
                    continue;
                }
                const result = await RewardRecord.findOne({
                    include: [
                        {
                            model: User,
                            as: 'user',
                            where: userCondition,
                            attributes: []
                        }
                    ],
                    attributes: [[fn('COUNT', literal('DISTINCT user_id')), 'user_count']],
                    where: {
                        reward_id: i,
                        ...condition
                    },
                    raw: true
                });
                countObj[`reward${i}UserCount`] = Number(result.user_count || 0);
            }

            const data = {
                rewards: rows,
                ...countObj,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: total > 0 ? Math.ceil(total / perPage) : total,
                    total: total
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ADD_REWARD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { user_id, is_all_user, reward_id, amount } = req.body;
            const rewardType = await RewardType.findByPk(reward_id, { attributes: ['id', 'title'] });
            if (reward_id != 9 && !rewardType) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到奖励类型', {});
            }
            if (is_all_user && Number(is_all_user) == 1) {
                const obj = { reward_id: Number(reward_id), amount: Number(amount) }
                await this.redisHelper.setValue('RELEASE_REWARD_TO_ALL_USERS', JSON.stringify(obj));
                // Cron job will do this at 20th minute of every hour
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '已设置为批量发放奖励任务，系统每10分钟自动处理', {});
            }
            const user = await User.findByPk(user_id, { attributes: ['id', 'relation', 'balance', 'referral_bonus', 'masonic_fund'] });
            if (!user) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到用户', {});
            }

            const obj = {
                user_id: user.id,
                relation: user.relation,
                reward_id: Number(reward_id == 9 ? 8 : reward_id), // 补签卡按共济基金处理
                is_background_added: 1,
                from_where: '后台发放春节活动补签卡',
                is_spring_festival_event: reward_id == 9 ? 1 : 0,
                check_in_type: reward_id == 9 ? 2 : 0
            }
            const t = await db.transaction();
            try {
                if (obj.reward_id == 1) {
                    // 共济基金
                    obj.amount = amount;
                    obj.is_used = 1;
                    obj.before_amount = user.masonic_fund;
                    obj.after_amount = Number(user.masonic_fund) + Number(amount);
                    await RewardRecord.create(obj, { transaction: t });
                    await user.increment({ masonic_fund: amount }, { transaction: t });
                }
                if (obj.reward_id == 2) {
                    // 上合战略黄金持有克数
                    const now = new Date();
                    const validUntil = new Date(now);
                    validUntil.setMonth(validUntil.getMonth() + 3);
                    obj.amount = amount;
                    obj.validedAt = validUntil;
                    await RewardRecord.create(obj, { transaction: t });
                }
                if (obj.reward_id == 3) {
                    // 账户余额
                    obj.amount = amount;
                    obj.is_used = 1;
                    obj.before_amount = user.balance;   
                    obj.after_amount = Number(user.balance) + Number(amount);
                    await RewardRecord.create(obj, { transaction: t });
                    await user.increment({ balance: amount, masonic_fund: -amount }, { transaction: t });
                }
                if ([4,6,8,9].includes(obj.reward_id)) {
                    // 上合组织各国授权书
                    obj.amount = 100;
                    if (obj.reward_id == 8 || obj.reward_id == 9) {
                        obj.amount = amount; // 推荐奖励
                    }
                    if (obj.reward_id == 6) {
                        await user.update({ have_reward_6: 1 }, { transaction: t });
                    }
                    await RewardRecord.create(obj, { transaction: t });
                }
                if (obj.reward_id == 7) {
                    // 上合战略储备黄金券
                    const now = new Date();
                    const validUntil = new Date(now);
                    validUntil.setMonth(validUntil.getMonth() + 3);
                    obj.amount = amount;
                    obj.validedAt = validUntil;
                    await RewardRecord.create(obj, { transaction: t });
                }
                await t.commit();
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '添加奖励成功', {});
            } catch (error) {
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '添加奖励失败', {});
            }
        } catch (error) {
            errLogger(`[ADD_REWARD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE_REWARD = async (req, res) => {
        try {
            const { id } = req.params;
            const reward = await RewardRecord.findByPk(id, { attributes: ['id','amount', 'reward_id', 'user_id', 'is_used', 'is_background_added'] });
            if (!reward) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }
            if (reward.is_background_added == 0) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '非后台添加奖励，无法删除', {});
            }
            if (reward.is_used == 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '奖励已使用，无法删除', {});
            }

            await reward.destroy();
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[DELETE_REWARD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    MULTIPLE_DELETE_REWARD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { ids } = req.body;
            const rewards = await RewardRecord.findAll({ 
                where: {
                    id: { [Op.in]: ids },
                    is_background_added: 1,
                    is_used: 0
                },
                attributes: ['id','amount', 'reward_id', 'user_id', 'is_used', 'is_background_added']
            });

            if (rewards.length != ids.length) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '部分奖励无法删除，请确认后重试', {});
            }
            await RewardRecord.destroy({ 
                where: { id: { [Op.in]: ids } }, 
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[MULTIPLE_DELETE_REWARD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE_ALL_BACKGROUND_ADDED_REWARD = async (req, res) => {
        try {
            let condition = {
                is_background_added: 1,
                is_used: 0,
            }
            const rewards = await RewardRecord.findAll({ 
                where: condition,
                attributes: ['id','amount', 'reward_id', 'user_id', 'is_used', 'is_background_added']
            });

            // separate into chunks to avoid too many deletions at once
            const chunkSize = 1000;
            for (let i = 0; i < rewards.length; i += chunkSize) {
                const chunk = rewards.slice(i, i + chunkSize);
                const ids = chunk.map(r => r.id);
                await RewardRecord.destroy({ 
                    where: { id: { [Op.in]: ids } }
                });
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[DELETE_ALL_BACKGROUND_ADDED_REWARD]: ${error.stack}`);
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