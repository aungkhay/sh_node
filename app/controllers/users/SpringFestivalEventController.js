const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { User, RewardRecord, UserSpringFestivalCheckIn, UserSpringFestivalCheckInLog, UserKYC, db } = require('../../models');
const { Op } = require('sequelize');
const { errLogger } = require('../../helpers/Logger');
const moment = require('moment');

class Controller {
    constructor (app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getRandomInt = (min, max) => {
            return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
        }
        this.eventStart = new Date('2026-01-28T00:00:00+08:00');
        this.eventEnd = new Date('2026-02-17T23:59:59+08:00');
        // this.eventStart = new Date('2026-02-05T00:00:00+08:00');
        // this.eventEnd = new Date('2026-02-25T23:59:59+08:00');
    }

    GET_MISSING_DATES = (dates) => {
        try {
            const format = 'YYYY-MM-DD';

            const dateSet = new Set(dates);

            const start = moment(dates[0], format);
            const end = moment(dates[dates.length - 1], format);

            const missingDates = [];

            let current = start.clone();
            while (current.isSameOrBefore(end)) {
                const d = current.format(format);
                if (!dateSet.has(d)) {
                    missingDates.push(d);
                }
                current.add(1, 'day');
            }

            return missingDates;
        } catch (error) {
            return [];
        }
    }

    USER_DOWNLINE_LEVEL = async (userId, level = 3) => {
        try {
            const users = await User.findAll({ 
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    where: { status: 'APPROVED' },
                    attributes: []
                },
                where: { parent_id: userId }, 
                attributes: ['id'] 
            });
            const userIds = users.map(u => {
                return u.id;
            });
            return userIds;

            if (level > 0) {
                const level1Ids = await User.findAll({ 
                    include: {
                        model: UserKYC,
                        as: 'kyc',
                        where: { status: 'APPROVED' },
                        attributes: []
                    },
                    where: { parent_id: userId }, 
                    attributes: ['id'] 
                });
                const level1IdArr = level1Ids.map(u => {
                    return u.id;
                });
                // console.log('Level 1', level1IdArr);
                if (level > 1 && level1IdArr.length > 0) {
                    const level2Ids = await User.findAll({ 
                        include: {
                            model: UserKYC,
                            as: 'kyc',
                            where: { status: 'APPROVED' },
                            attributes: []
                        },
                        where: { parent_id: { [Op.in]: level1IdArr } },
                        attributes: ['id'] });
                    const level2IdArr = level2Ids.map(u => {
                        return u.id;
                    });
                    // console.log('Level 2', level2IdArr);
                    if (level > 2 && level2IdArr.length > 0) {
                        const level3Ids = await User.findAll({
                            include: {
                                model: UserKYC,
                                as: 'kyc',
                                where: { status: 'APPROVED' },
                                attributes: []
                            },
                            where: { parent_id: { [Op.in]: level2IdArr } }, 
                            attributes: ['id'] 
                        });
                        const level3IdArr = level3Ids.map(u => {
                            return u.id;
                        });
                        // console.log('Level 3', level3IdArr);
                        users.push(...level1IdArr, ...level2IdArr, ...level3IdArr);
                    }
                }   
            }

            return users;
        } catch (error) {
            console.error('Error in USER_DOWNLINE_LEVEL:', error);
            return [];
        }
    }

    CHECK_IN_EVENT_ = async (req, res) => {
        try {
            const userId = req.user_id;

            // 活动时间限制
            const eventStart = new Date('2026-02-05T00:00:00+08:00');
            const eventEnd = new Date('2026-02-25T23:59:59+08:00');
            const now = new Date();
            // if (now < eventStart || now > eventEnd) {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '活动未在进行时间内', {});
            // }

            const user = await User.findByPk(userId, {
                // include: {
                //     model: UserKYC,
                //     as: 'kyc',
                //     where: { status: 'APPROVED' },
                //     attributes: []
                // },
                attributes: ['id', 'relation'] 
            });
            if (!user) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '用户未实名，无法参与活动', {});
            }

            const checkInRecord = await UserSpringFestivalCheckIn.findOne({ where: { user_id: userId } });
            if (checkInRecord) {
                // 已签到，检查今天是否已签到
                const lastCheckInDate = checkInRecord.last_check_in_date;
                if (lastCheckInDate) {
                    const lastDate = new Date(lastCheckInDate);
                    if (lastDate.getFullYear() === now.getFullYear() &&
                        lastDate.getMonth() === now.getMonth() &&
                        lastDate.getDate() === now.getDate()) {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '今日已签到，明天再来吧！', {});
                    }
                }
            }

            const rewardRecord = await RewardRecord.findOne({ where: { user_id: userId, is_spring_festival_event: 1, check_in_type: 1 }, order: [['createdAt', 'DESC']] });

            let totalCheckIn = 0;
            let resMsg = '签到成功';

            const t = await db.transaction();
            try {

                if (!checkInRecord) {
                    totalCheckIn = 1;
                    // 首次签到，创建记录
                    await UserSpringFestivalCheckIn.create({
                        user_id: userId,
                        relation: user.relation,
                        total_check_in: totalCheckIn,
                        last_check_in_date: now,
                        start_counting_date: moment(now).format('YYYY-MM-DD') + ' 00:00:00'
                    }, { transaction: t });
                } else {
                    totalCheckIn = checkInRecord.total_check_in + 1;
                    const updateObj = {
                        total_check_in: totalCheckIn,
                        last_check_in_date: now
                    };

                    const checkInLogsCount = await UserSpringFestivalCheckInLog.count({
                        where: {
                            user_id: userId,
                            check_in_date: {
                                // Feb 5 to Feb 10, 2026 // total 6 days
                                [Op.between]: [
                                    // eventStart,
                                    // new Date('2026-02-10T23:59:59+08:00'),
                                    new Date('2026-01-23T00:00:00+08:00'),
                                    new Date('2026-01-28T23:59:59+08:00'),
                                ]
                            }
                        }
                    });
                    const lastLog = await UserSpringFestivalCheckInLog.findOne({
                        attributes: ['id', 'check_in_date'],
                        where: {
                            user_id: userId,
                        },
                        order: [['id', 'DESC']]
                    });
                    console.log('Check-in logs count from event start to now:', checkInLogsCount);
                    const yesterdayDate = moment(now).subtract(1, 'day').format('YYYY-MM-DD');
                    const lastLogDate = moment(lastLog.check_in_date).format('YYYY-MM-DD');
                    console.log('Last log date:', lastLogDate, 'Yesterdat date:', yesterdayDate);

                    if (checkInLogsCount >= 5 && lastLogDate == yesterdayDate) {
                        const repairCard = await RewardRecord.findOne({
                            attributes: ['id', 'createdAt'],
                            where: {
                                user_id: userId,
                                reward_id: 8,
                                is_spring_festival_event: 1,
                                check_in_type: 2
                            },
                            order: [['id', 'DESC']]
                        });
                        if (!repairCard) {
                            // 发放补签卡
                            await RewardRecord.create({
                                user_id: userId,
                                relation: user.relation,
                                reward_id: 8,
                                amount: 1,
                                from_where: '春季签到活动补签卡奖励',
                                is_spring_festival_event: 1,
                                check_in_type: 2
                            }, { transaction: t });

                            updateObj.start_counting_date = moment(now).add(1, 'day').format('YYYY-MM-DD') + ' 00:00:00';
                        } else {
                            // Continue checking continuous logs
                            // const lastCheckInDate = moment(checkInRecord.last_check_in_date).format('YYYY-MM-DD');
                            // const subStractOneDay = moment(now).subtract(1, 'day').format('YYYY-MM-DD');
                            // let StartCountingDate = checkInRecord.start_counting_date;
                            // // Check if last check-in date is not the day before today, means user has missed a day
                            // // So we need to update the start_counting_date to today to allow next 6 days check-in counting
                            // if (lastCheckInDate !== subStractOneDay) {
                            //     updateObj.start_counting_date = moment(now).format('YYYY-MM-DD') + ' 00:00:00';
                            //     StartCountingDate = moment(now).subtract(1, 'day').toDate();
                            // }

                            // const continuousLogsCount = await UserSpringFestivalCheckInLog.count({
                            //     where: {
                            //         user_id: userId,
                            //         check_in_date: {
                            //             [Op.between]: [
                            //                 moment(StartCountingDate).add(1, 'days').format('YYYY-MM-DD') + ' 00:00:00',
                            //                 moment(StartCountingDate).add(6, 'days').format('YYYY-MM-DD') + ' 23:59:59'
                            //             ]
                            //         }
                            //     }
                            // });

                            // 
                            const logsCount = await UserSpringFestivalCheckInLog.count({
                                where: {
                                    user_id: userId,
                                    check_in_date: {
                                        [Op.between]: [
                                            moment(checkInRecord.start_counting_date).add(1, 'days').format('YYYY-MM-DD') + ' 00:00:00',
                                            moment(now).format('YYYY-MM-DD') + ' 23:59:59'
                                        ]
                                    }
                                }
                            });
                            if (logsCount >= 6) { 
                                // 发放补签卡
                                await RewardRecord.create({
                                    user_id: userId,
                                    relation: user.relation,
                                    reward_id: 8,
                                    amount: 1,
                                    from_where: '春季签到活动补签卡奖励',
                                    is_spring_festival_event: 1,
                                    check_in_type: 2
                                }, { transaction: t });

                                updateObj.start_counting_date = moment(now).add(1, 'day').format('YYYY-MM-DD') + ' 00:00:00';
                            }
                        }

                        if (totalCheckIn == 7) {
                            updateObj.is_completed_7 = 1;
                            const amount = this.getRandomInt(20, 29);
                            const validUntil = new Date(eventStart);
                            // Valid At Feb 26, 2026 00:00:00 Beijing Time
                            validUntil.setDate(validUntil.getDate() + 21);

                            await RewardRecord.create({
                                user_id: userId,
                                relation: user.relation,
                                reward_id: 8, // 推荐金提取券
                                amount: amount,
                                from_where: '春季签到活动奖励',
                                validedAt: validUntil,
                                is_spring_festival_event: 1,
                                check_in_type: 1
                            }, { transaction: t });

                            resMsg = '恭喜您完成连续签到，继续签到可以获得更大额度推荐金提取券。';
                        } else if (totalCheckIn == 14) {
                            updateObj.is_completed_14 = 1;
                            const downlineUsers = await this.USER_DOWNLINE_LEVEL(userId, 3);
                            console.log('Downline Users for 14 days check-in:', downlineUsers.length);
                            if (downlineUsers.length >= 10) {
                                const amount = this.getRandomInt(30, 49);
                                await rewardRecord.update({ amount: amount }, { transaction: t });
                            }
                        } else if (totalCheckIn == 21) {
                            updateObj.is_completed_21 = 1;
                            let resAmount = rewardRecord.amount;
                            const downlineUsers = await this.USER_DOWNLINE_LEVEL(userId, 3);
                            console.log('Downline Users for 21 days check-in:', downlineUsers.length);
                            if (downlineUsers.length >= 20) {
                                const amount = this.getRandomInt(50, 60);   
                                await rewardRecord.update({ amount: amount }, { transaction: t });
                                resAmount = amount;
                            }
                            resMsg = `恭喜您完成21天共签活动，您的活动奖励：${resAmount}%推荐金提取券已发放到您的道具仓库，您可以在“我的道具”列表查看`;
                        }
                    }

                    await checkInRecord.update(updateObj, { transaction: t });
                }

                await UserSpringFestivalCheckInLog.create({
                    user_id: userId,
                    relation: user.relation,
                    check_in_date: now,
                }, { transaction: t });

                await t.commit();
            } catch (error) {
                console.log(error)
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '签到失败', {});
            }
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, resMsg, { });
        } catch (error) {
            errLogger(`[SpringFestivalEvent][CHECK_IN_EVENT]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHECK_IN_EVENT = async (req, res) => {
        try {
            const userId = req.user_id;

            // 活动时间限制
            const now = new Date();
            if (now < this.eventStart) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '活动未在进行时间内', {});
            }
            if (now > this.eventEnd) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '活动已结束，感谢您的参与', {});
            }

            const user = await User.findByPk(userId, {
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    where: { status: 'APPROVED' },
                    attributes: []
                },
                attributes: ['id', 'relation', 'can_join_spring_event'] 
            });
            if (!user) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '用户未实名，无法参与活动', {});
            }

            if (user.can_join_spring_event != 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您暂无资格参加此次活动，如有疑问请联系在线客服', {});
            }

            const checkInRecord = await UserSpringFestivalCheckIn.findOne({ where: { user_id: userId } });
            if (checkInRecord) {
                // 已签到，检查今天是否已签到
                const lastCheckInDate = checkInRecord.last_check_in_date;
                if (lastCheckInDate) {
                    const lastDate = new Date(lastCheckInDate);
                    if (lastDate.getFullYear() === now.getFullYear() &&
                        lastDate.getMonth() === now.getMonth() &&
                        lastDate.getDate() === now.getDate()) {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '今日已签到，明天再来吧！', {});
                    }
                }
            }

            const rewardRecord = await RewardRecord.findOne({ where: { user_id: userId, is_spring_festival_event: 1, check_in_type: 1 }, order: [['createdAt', 'DESC']] });

            let totalCheckIn = 0;
            let resMsg = '签到成功';

            const t = await db.transaction();
            try {

                if (!checkInRecord) {
                    totalCheckIn = 1;
                    // 首次签到，创建记录
                    await UserSpringFestivalCheckIn.create({
                        user_id: userId,
                        relation: user.relation,
                        total_check_in: totalCheckIn,
                        last_check_in_date: now,
                    }, { transaction: t });
                } else {
                    totalCheckIn = checkInRecord.total_check_in + 1;
                    const updateObj = {
                        total_check_in: totalCheckIn,
                        last_check_in_date: now
                    };

                    if (totalCheckIn % 6 === 0) {
                        // 发放补签卡
                        await RewardRecord.create({
                            user_id: userId,
                            relation: user.relation,
                            reward_id: 8,
                            amount: 1,
                            from_where: '春季签到活动补签卡奖励',
                            is_spring_festival_event: 1,
                            check_in_type: 2
                        }, { transaction: t });
                    }

                    if (totalCheckIn == 7) {
                        updateObj.is_completed_7 = 1;
                        const amount = this.getRandomInt(20, 29);
                        const validUntil = new Date(this.eventStart);
                        // Valid At Feb 26, 2026 00:00:00 Beijing Time
                        validUntil.setDate(validUntil.getDate() + 21);

                        await RewardRecord.create({
                            user_id: userId,
                            relation: user.relation,
                            reward_id: 8, // 推荐金提取券
                            amount: amount,
                            from_where: '春季签到活动奖励',
                            validedAt: validUntil,
                            is_spring_festival_event: 1,
                            check_in_type: 1
                        }, { transaction: t });

                        resMsg = '恭喜您完成连续签到，继续签到可以获得更大额度推荐金提取券。';
                    }

                    if (totalCheckIn == 14) {
                        updateObj.is_completed_14 = 1;
                        const downlineUsers = await this.USER_DOWNLINE_LEVEL(userId, 3);
                        console.log('Downline Users for 14 days check-in:', downlineUsers.length);
                        if (downlineUsers.length >= 10) {
                            const amount = this.getRandomInt(30, 49);
                            await rewardRecord.update({ amount: amount }, { transaction: t });
                        }
                    }

                    if (totalCheckIn == 21) {
                        updateObj.is_completed_21 = 1;
                        let resAmount = rewardRecord.amount;
                        const downlineUsers = await this.USER_DOWNLINE_LEVEL(userId, 3);
                        console.log('Downline Users for 21 days check-in:', downlineUsers.length);
                        if (downlineUsers.length >= 20) {
                            const amount = this.getRandomInt(50, 60);   
                            await rewardRecord.update({ amount: amount }, { transaction: t });
                            resAmount = amount;
                        }
                        resMsg = `恭喜您完成21天共签活动，您的活动奖励：${resAmount}%推荐金提取券已发放到您的道具仓库，您可以在“我的道具”列表查看`;
                    }

                    await checkInRecord.update(updateObj, { transaction: t });
                }

                await UserSpringFestivalCheckInLog.create({
                    user_id: userId,
                    relation: user.relation,
                    check_in_date: now,
                }, { transaction: t });

                await t.commit();
            } catch (error) {
                console.log(error)
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '签到失败', {});
            }
            
            return MyResponse(res, this.ResCode.SUCCESS.code, true, resMsg, { });
        } catch (error) {
            errLogger(`[SpringFestivalEvent][CHECK_IN_EVENT]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    USE_REPAIR_CARD = async (req, res) => {
        try {
            const userId = req.user_id;
            const cardId = req.params.id;

            const repairCard = await RewardRecord.findOne({
                attributes: ['id', 'is_used'],
                where: {
                    id: cardId,
                    user_id: userId,
                    reward_id: 8,
                    is_spring_festival_event: 1,
                    check_in_type: 2,
                    is_repair: 1
                }
            });
            if (!repairCard) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '补签卡不存在', {});
            }
            if (repairCard.is_used == 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '补签卡已使用', {});
            }

            const checkInRecord = await UserSpringFestivalCheckIn.findOne({ where: { user_id: userId } });
            if (!checkInRecord) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '无签到记录，无法使用补签卡', {});
            }

            // Check wherether there is any missing check-in days
            const checkInLogs = await UserSpringFestivalCheckInLog.findAll({
                attributes: ['check_in_date'],
                where: {
                    user_id: userId,
                }
            });
            const checkInDates = checkInLogs.map(log => {
                return moment(log.check_in_date).format('YYYY-MM-DD');
            });

            const missingDates = this.GET_MISSING_DATES(checkInDates);
            if (missingDates.length === 0) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '当前无缺失签到记录，无法使用补签卡', {});
            }

            const user = await User.findByPk(userId, { attributes: ['id', 'relation'] });
            const rewardRecord = await RewardRecord.findOne({ where: { user_id: userId, is_spring_festival_event: 1, check_in_type: 1 }, order: [['createdAt', 'DESC']] });

            let resMsg = '';
            const t = await db.transaction();
            try {
                const currentTime = moment().format('HH:mm:ss');
                // 补签最早缺失的日期
                await UserSpringFestivalCheckInLog.create({
                    user_id: userId,
                    relation: user.relation,
                    check_in_date: new Date(missingDates[0] + ' ' + currentTime)
                }, { transaction: t });

                let totalCheckIn = checkInRecord.total_check_in + 1;
                const updateObj = {
                    total_check_in: totalCheckIn,
                    last_check_in_date: new Date()
                };

                if (totalCheckIn == 7) {
                    updateObj.is_completed_7 = 1;
                    const amount = this.getRandomInt(20, 29);
                    const validUntil = new Date(this.eventStart);
                    // Valid At Feb 26, 2026 00:00:00 Beijing Time
                    validUntil.setDate(validUntil.getDate() + 21);

                    await RewardRecord.create({
                        user_id: userId,
                        relation: user.relation,
                        reward_id: 8, // 推荐金提取券
                        amount: amount,
                        from_where: '春季签到活动奖励',
                        validedAt: validUntil,
                        is_spring_festival_event: 1,
                        check_in_type: 1
                    }, { transaction: t });

                    resMsg = '恭喜您完成连续签到，继续签到可以获得更大额度推荐金提取券。';
                }

                if (totalCheckIn == 14) {
                    updateObj.is_completed_14 = 1;
                    const downlineUsers = await this.USER_DOWNLINE_LEVEL(userId, 3);
                    console.log('Downline Users for 14 days check-in:', downlineUsers.length);
                    if (downlineUsers.length >= 10) {
                        const amount = this.getRandomInt(30, 49);
                        await rewardRecord.update({ amount: amount }, { transaction: t });
                    }
                }

                if (totalCheckIn == 21) {
                    updateObj.is_completed_21 = 1;
                    let resAmount = rewardRecord.amount;
                    const downlineUsers = await this.USER_DOWNLINE_LEVEL(userId, 3);
                    console.log('Downline Users for 21 days check-in:', downlineUsers.length);
                    if (downlineUsers.length >= 20) {
                        const amount = this.getRandomInt(50, 60);   
                        await rewardRecord.update({ amount: amount }, { transaction: t });
                        resAmount = amount;
                    }
                    resMsg = `恭喜您完成21天共签活动，您的活动奖励：${resAmount}%推荐金提取券已发放到您的道具仓库，您可以在“我的道具”列表查看`;
                }
                
                await checkInRecord.update(updateObj, { transaction: t });
                await repairCard.update({ is_used: 1 }, { transaction: t });
                await t.commit();
            } catch (error) {
                console.log(error)
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '使用补签卡失败', {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, `补签成功${resMsg ? ': '+  resMsg : ''}`, {});
        } catch (error) {
            errLogger(`[SpringFestivalEvent][USE_REPAIR_CARD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHECK_IN_LOGS = async (req, res) => {
        try {
            const userId = req.user_id;

            const checkInLogs = await UserSpringFestivalCheckInLog.findAll({
                attributes: ['check_in_date'],
                where: { user_id: userId },
                order: [['check_in_date', 'ASC']]
            });

            const dates = checkInLogs.map(log => {
                return moment(log.check_in_date).format('YYYY-MM-DD');
            });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', dates);
        } catch (error) {
            errLogger(`[SpringFestivalEvent][CHECK_IN_LOGS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller