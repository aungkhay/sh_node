const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const moment = require('moment');
const { Op } = require('sequelize');
const { errLogger } = require('../../helpers/Logger');
const { GoldPlanCheckIn, db, User, RewardRecord, UserKYC } = require('../../models');
const RedisHelper = require('../../helpers/RedisHelper');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getRandomInt = (min, max) => {
            return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
        };
        this.redisHelper = new RedisHelper(app);
    }

    CHECK_IN = async (req, res) => {
        const lockKey = `gold_plan_check_in_${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1, 5);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }
            
            const userId = req.user_id;
            const today = moment().format('YYYY-MM-DD');
            // const existingCheckInCount = await GoldPlanCheckIn.count({
            //     where: {
            //         user_id: userId,
            //         date: today
            //     },
            //     useMaster: true
            // });
            // if (existingCheckInCount > 0) {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '今日已签到', {});
            // }
            const user = await User.findByPk(userId, { 
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['id']
                },
                attributes: ['id', 'relation', 'total_gold_count'],
                useMaster: true
            });
            if (!user || !user.kyc) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请验证实名', {});
            }

            const goldCount = this.getRandomInt(5, 10);

            const t = await db.transaction();
            try {
                await GoldPlanCheckIn.create({
                    user_id: userId,
                    relation: user.relation,
                    date: today,
                    gold_count: goldCount
                }, { transaction: t });

                const now = new Date();
                const validUntil = new Date(now);      // clone original date
                validUntil.setMonth(validUntil.getMonth() + 3);

                await RewardRecord.create({
                    user_id: userId,
                    relation: user.relation,
                    reward_id: 7, // 上合战略储备黄金券
                    amount: goldCount,
                    validedAt: validUntil,
                    from_where: `签到赢黄金计划奖励`,
                }, { transaction: t });

                await t.commit();

                await this.redisHelper.deleteKey(`gold_plan_check_in_history_${userId}`);
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '签到成功', {});
            } catch (error) {
                await t.rollback();

                if (error.name === 'SequelizeUniqueConstraintError') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '今日已签到', {});
                }
                
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '签到失败', {});
            }

        } catch (error) {
            errLogger(`[GoldPlanCheckIn][CHECK_IN]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHECK_IN_HISTORY = async (req, res) => {
        try {
            const userId = req.user_id;

            let histories = await this.redisHelper.getValue(`gold_plan_check_in_history_${userId}`);
            if (histories) {
                histories = JSON.parse(histories);
            } else {
                histories = await GoldPlanCheckIn.findAll({
                    where: { user_id: userId },
                    attributes: ['id', 'date', 'gold_count'],
                    useMaster: true,
                });
                await this.redisHelper.setValue(`gold_plan_check_in_history_${userId}`, JSON.stringify(histories));
            }
                
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', histories);
        } catch (error) {
            errLogger(`[GoldPlanCheckIn][CHECK_IN_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {}); 
        }
    }
}



module.exports = Controller;