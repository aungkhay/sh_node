const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const moment = require('moment');
const { Op } = require('sequelize');
const { errLogger } = require('../../helpers/Logger');
const { GoldPlanCheckIn, db, User, RewardRecord } = require('../../models');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getRandomInt = (min, max) => {
            return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
        };
    }

    CHECK_IN = async (req, res) => {
        try {
            const userId = req.user_id;
            const today = moment().format('YYYY-MM-DD');
            const existingCheckIn = await GoldPlanCheckIn.findOne({
                where: {
                    user_id: userId,
                    date: today
                }
            });
            if (existingCheckIn) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '今日已签到', {});
            }
            const user = await User.findByPk(userId, { attributes: ['id', 'relation'] });

            const goldCount = this.getRandomInt(1, 20);

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
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '签到成功', {});
            } catch (error) {
                await t.rollback();
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
            let histories = await GoldPlanCheckIn.findAll({
                where: { user_id: userId },
                attributes: ['id', 'date', 'gold_count']
            });
                
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', histories);
        } catch (error) {
            errLogger(`[GoldPlanCheckIn][CHECK_IN_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {}); 
        }
    }
}



module.exports = Controller;