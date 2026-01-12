const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { News, db, Notification, SpecificUserNotification, User, RewardType, Config, RewardRecord, UserRankPoint } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const multer = require('multer');
const path = require('path');
const AliOSS = require('../../helpers/AliOSS');
const { Op } = require('sequelize');
const NewsReports = require('../../models/NewsReports');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
        this.adminLogger = this.commonHelper.adminLogger;
        this.OSS = new AliOSS();
        this.getRandomInt = (min, max) => {
            return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
        }
    }

    GET_ALIOSS_SIGN = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { filename, content_type } = req.body;
            const filePath = `/uploads/news/${filename}`;
            const url = await this.OSS.SIGN_URL(filePath, content_type);
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { sign_url: url, file_url: filePath });
        } catch (error) {
            errLogger(`[News][GET_ALIOSS_SIGN]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {}); 
        }
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const type = req.query.type;
            const status = req.query.status;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (type) {
                condition.type = type;
            }
            if (status >= 0) {
                condition.status = status;
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await News.findAndCountAll({
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                news: rows,
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

    CREATE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const user = await User.findByPk(req.user_id, { attributes: ['id', 'relation'] });

            const { type, title, subtitle, content, pic } = req.body;
            const news = await News.create({ type, title, subtitle, content, file_url: pic, relation: user.relation });

            // Log
            await this.adminLogger(req, 'News', 'create');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '添加成功', { id: news.id });
        } catch (error) {
            errLogger(`[News][CREATE]: ${error.stack}`);
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

            const { type, title, subtitle, content, pic } = req.body;
            const news = await News.findByPk(req.params.id, { attributes: ['id'] });
            if (!news) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            await news.update({ type, title, subtitle, content, file_url: pic });

            // Log
            await this.adminLogger(req, 'News', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', {});
        } catch (error) {
            errLogger(`[News][UPDATE]: ${error.stack}`);
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
            const news = await News.findByPk(req.params.id, { attributes: ['id', 'user_id', 'title', 'type'] });
            if (!news) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const t = await db.transaction();
            try {
                await news.update({ status, deniedAt: status === 'DENIED' ? new Date() : null }, { transaction: t });

                const user = await User.findByPk(news.user_id, { attributes: ['id', 'rank_point', 'relation', 'today_news_award_count', 'masonic_fund'], transaction: t });

                // Maximum reward per day: 2 (能量论坛)
                // Auto approved at frontend, temporarily disable reward for admin approved news
                if (status == 'DISABLED' && news.type == 1 && user && user.today_news_award_count < 2) {
                    // Approved
                    const randArr = [1,5,7,8,9];
                    const rewardTypes = await RewardType.findAll({
                        where: {
                            id: { [Op.in]: [1,5,7,8] }
                        },
                        attributes: ['id', 'remain_count', 'amount_min', 'amount_max'],
                        transaction: t
                    });
                    let randNum;
                    do {
                        randNum = this.getRandomInt(1, 10);
                    } while (!randArr.includes(randNum));

                    let notiContent = ' ';

                    if (randNum == 9) {
                        // 经验值
                        const config = await Config.findOne({
                            where: { type: 'news_random_rankpoint' },
                            attributes: ['val'],
                            transaction: t
                        });
                        const split = JSON.parse(config.val);
                        if (split.length >= 2) {
                            const rankPoint = this.getRandomInt(split[0], split[1]);
                            await user.increment({ rank_point: rankPoint, today_news_award_count: 1 }, { transaction: t });
                            await UserRankPoint.create({ from: 1, to: user.id, amount: rankPoint, type: 2, relation: user.relation }, { transaction: t });
                            notiContent = `您已获得${rankPoint}经验值`;
                        }

                    } else if (randNum == 1) {
                        // 共济基金
                        const reward = rewardTypes.find(r => r.id == 1);
                        if (reward.remain_count > 0) {
                            const amount = this.getRandomInt(reward.amount_min, reward.amount_max);
                            const obj = {
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: reward.id,
                                amount: amount,
                                before_amount: user.masonic_fund,
                                after_amount: Number(user.masonic_fund) + Number(amount),
                                from_where: `通过能量论坛 获得共济基金`,
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 1 },
                                transaction: t
                            });
                            await user.increment({ masonic_fund: amount, today_news_award_count: 1 }, { transaction: t });
                            notiContent = `您已获得${amount}共济基金`;
                        }

                    } else if (randNum == 7) {
                        // 上合战略储备黄金券
                        const reward = rewardTypes.find(r => r.id == 7);
                        if (reward.remain_count > 0) {
                            const amount = this.getRandomInt(reward.amount_min, reward.amount_max);

                            const now = new Date();
                            const validUntil = new Date(now);      // clone original date
                            validUntil.setMonth(validUntil.getMonth() + 3);
                            
                            const obj = {
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: reward.id,
                                amount: amount,
                                validedAt: validUntil,
                                from_where: `通过能量论坛 获得上合战略储备黄金券`,
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 7 },
                                transaction: t
                            });
                            await user.increment({ today_news_award_count: 1 }, { transaction: t });
                            notiContent = `您已获得${amount}上合战略储备黄金券`;
                        }
                        
                    } else if (randNum == 8) {
                        // 推荐金提取券
                        const reward = rewardTypes.find(r => r.id == 8);
                        if (reward.remain_count > 0) {
                            const amount = this.getRandomInt(reward.amount_min, reward.amount_max);
                            const obj = {
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: reward.id,
                                amount: amount,
                                from_where: `通过能量论坛 获得推荐金提取券`
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 8 },
                                transaction: t
                            });
                            await user.increment({ today_news_award_count: 1 }, { transaction: t });
                            notiContent = `您已获得${amount}推荐金提取券`;
                        }
                    }

                    const noti = await Notification.create({
                        type: 3, // for user specific
                        title: `您的【${news.title}】已通过`,
                        content: notiContent,
                        status: 1
                    }, { transaction: t });

                    await SpecificUserNotification.create({ user_id: news.user_id, notification_id: noti.id }, { transaction: t });
                } else {

                    // const noti = await Notification.create({
                    //     type: 3, // for user specific
                    //     title: `您的【${news.title}】已被拒绝`,
                    //     content: '三天内无法再进行上传',
                    //     status: 1
                    // }, { transaction: t });

                    // await SpecificUserNotification.create({ user_id: news.user_id, notification_id: noti.id }, { transaction: t });
                }
                
                await t.commit();
            } catch (error) {
                await t.rollback();
                console.log(error);
                errLogger(`[News][UPDATE_STATUS]: ${error.stack}`);
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '更新失败', {});
            }

            // Log
            await this.adminLogger(req, 'News', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[News][UPDATE_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/news`;

            const upload = require('../../middlewares/UploadImageOrVideo');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '500MB' });
                    }
                    if (err.code == 'ENOENT') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, 'ENOENT', {});
                    }
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, err.message, {});
                } else if (err) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }

                if (req.file == null) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请选图片或视频', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/news/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/news/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: `/uploads/news/${fileName}` });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[News][UPLOAD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE = async (req, res) => {
        try {
            const news = await News.findByPk(req.params.id, { attributes: ['id'] });
            if (!news) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到新闻', {});
            }

            await news.destroy();

            // Log
            await this.adminLogger(req, 'News', 'delete');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[News][DELETE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REPORTED_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

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

            const { rows, count } = await NewsReports.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name']
                    },
                    {
                        model: News,
                        as: 'news',
                        attributes: ['id', 'title']
                    }
                ],
                where: condition,
                attributes: ['id', 'description', 'status', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                reports: rows,
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

    UPDATE_REPORT_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { status } = req.body;
            const report = await NewsReports.findByPk(req.params.id, { attributes: ['id', 'status', 'news_id'] });
            if (!report) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到举报记录', {});
            }
            if (report.status === 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该举报已被通过，无法重复操作', {});
            }

            if(report.status === 'DENIED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该举报已被驳回，无法重复操作', {});
            }

            const t = await db.transaction();
            try {
                
                await report.update({ status }, { transaction: t });
                if (status === 'DENIED') {
                    const news = await News.findByPk(report.news_id, { attributes: ['id', 'reported_count'], transaction: t });
                    await news.increment({ reported_count: -1 }, { transaction: t });
                }

                await t.commit();

            } catch (error) {
                await t.rollback();
                console.log(error);
                errLogger(`[News][UPDATE_REPORT_STATUS]: ${error.stack}`);
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '更新失败', {});
            }

            // Log
            await this.adminLogger(req, 'NewsReports', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});

        } catch (error) {
            errLogger(`[News][UPDATE_REPORT_STATUS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller