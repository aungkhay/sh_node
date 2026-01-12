const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { Notification, News, UserCertificate, Certificate, Information, ReadNotification, SpecificUserNotification, Config, User, RewardType, RewardRecord, db, Rank, Allowance, Ticket, TicketRecord, InheritOwner, Interest, Transfer, MasonicFundHistory, MasonicFund, UserKYC, GoldPrice, UserGoldPrice, Banner, NewsLikes, GoldInterest, RedemptCode, UserRankPoint } = require('../../models');
const { Op, literal, Sequelize } = require('sequelize');
const { errLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const Impeachment = require('../../models/Impeachment');
const multer = require('multer');
const path = require('path');
const Decimal = require('decimal.js');
const AliOSS = require('../../helpers/AliOSS');
const NewsReports = require('../../models/NewsReports');
const RankHistory = require('../../models/RankHistory');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
        this.redisHelper = new RedisHelper(app);
        this.OSS = new AliOSS();
        this.getRandomInt = (min, max) => {
            return Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
        }
    }

    GET_SERVER_TIME = async (req, res) => {
        try {
            const serverTime = Math.floor(Date.now());
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { serverTime: serverTime });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_FILE_PATH = async (req, res) => {
        try {
            let oss = await this.redisHelper.getValue('ali_oss');
            if (!oss) {
                const config = await Config.findOne({ where: { type: 'ali_oss' }, attributes: ['val'] });
                await this.redisHelper.setValue('ali_oss', config.val);
                oss = config.val;
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { path: oss });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_POPUP_ANNOUNCEMENT = async (req, res) => {
        try {
            let popup_announcement = await this.redisHelper.getValue('popup_announcement');
            let is_show_popup = Number(await this.redisHelper.getValue('is_show_popup') || 0);
            if (!popup_announcement) {
                const config = await Config.findOne({ where: { type: 'popup_announcement' }, attributes: ['val', 'description'] });
                await this.redisHelper.setValue('popup_announcement', config.val);
                popup_announcement = config.val;
                is_show_popup = Number(config.description);
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { popup_announcement: popup_announcement, is_show_popup: is_show_popup });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_CUSTOMER_SERVICE = async (req, res) => {
        try {
            const type = req.params.type;
            let customer_service = await this.redisHelper.getValue(`customer_service_${type}`);
            if (!customer_service) {
                const config = await Config.findOne({ where: { type: `customer_service_${type}` }, attributes: ['val'] });
                if (config) {
                    await this.redisHelper.setValue(`customer_service_${type}`, config.val);
                    customer_service = config.val;
                }
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { customer_service: customer_service });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    NOTIFICATIONS = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const isRead = req.query.isRead || 0;

            const notifications = await this.redisHelper.getValue(`notifications_${userId}_${page}_${perPage}_${offset}_${isRead}`);
            if (notifications) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', JSON.parse(notifications));
            }

            if (isRead) {
                const { rows, count } = await Notification.findAndCountAll({
                    where: {
                        [Op.or]: [
                            { type: { [Op.in]: [1, 2] } },   // global notifications
                            { type: 3 }                       // specific notifications, filtered in include
                        ]
                    },
                    include: [
                        {
                            model: ReadNotification,
                            as: 'read_notifications',
                            required: true,               // ✅ only include notifications that are read
                            where: { user_id: userId },   // filter by user
                            attributes: []
                        },
                        {
                            model: SpecificUserNotification,
                            as: 'specific_notifications',
                            required: false,              // optional for specific notifications
                            where: { user_id: userId },
                            attributes: []
                        }
                    ],
                    distinct: true,   // ✅ important for pagination
                    attributes: ['id', 'title', 'subtitle', 'createdAt'],
                    order: [['id', 'DESC']],
                    limit: perPage,
                    offset
                });

                const data = {
                    notifications: rows,
                    meta: {
                        page: page,
                        perPage: perPage,
                        totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                        total: count
                    }
                }

                await this.redisHelper.setValue(`notifications_${userId}_${page}_${perPage}_${offset}_${isRead}`, JSON.stringify(data), 60); // cache for 60 seconds

                return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, data);
            } else {
                const { rows, count } = await Notification.findAndCountAll({
                    where: {
                        [Op.or]: [
                            { type: { [Op.in]: [1, 2] } },
                            literal(`EXISTS (
                                SELECT 1 FROM specific_user_notifications sn
                                WHERE sn.notification_id = Notification.id
                                AND sn.user_id = ${userId}
                            )`)
                        ],
                        id: {
                            [Op.notIn]: literal(`(SELECT notification_id FROM read_notifications WHERE user_id = ${userId})`)
                        }
                    },
                    attributes: ['id', 'title', 'subtitle', 'createdAt'],
                    order: [['id', 'DESC']],
                    limit: perPage,
                    offset
                });

                const data = {
                    notifications: rows,
                    meta: {
                        page: page,
                        perPage: perPage,
                        totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                        total: count
                    }
                }

                await this.redisHelper.setValue(`notifications_${userId}_${page}_${perPage}_${offset}_${isRead}`, JSON.stringify(data), 60); // cache for 60 seconds

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
            }
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    NOTIFICATION_DETAIL = async (req, res) => {
        try {
            const noti = await Notification.findByPk(req.params.id, {
                where: { status: 1 },
                attributes: ['id', 'title', 'subtitle', 'content', 'createdAt']
            });
            if (!noti) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', noti);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    MARK_NOTIFICATION_READ = async (req, res) => {
        try {
            const userId = req.user_id;
            const notification_id = req.params.id;

            const obj = {
                user_id: userId,
                notification_id: notification_id
            }
            const notification = await ReadNotification.findOne({ where: obj });
            if (notification) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '消息已读', {});
            }
            await ReadNotification.create(obj);

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_NEWS_OLD = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const type = req.query.type;

            let conditions = {
                status: 'APPROVED',
                contain_sensitive_word: 0,
                reported_count: 0
            };
            if (type) {
                conditions.type = type;
            } else {
                conditions.type = { [Op.in]: [2, 3] };
            }

            const attributes = ['id', 'title', 'subtitle', 'file_url', 'liked_count', 'createdAt'];
            if (type == 1) {
                attributes.push([
                    Sequelize.literal(`
                        EXISTS (
                            SELECT 1 
                            FROM news_likes nl
                            WHERE nl.news_id = News.id 
                            AND nl.user_id = ${req.user_id}
                        )
                    `),
                    'is_liked'
                ]);
            }

            const { rows, count } = await News.findAndCountAll({
                where: conditions,
                attributes: attributes,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const newsList = rows.map((news) => {
                let is_liked = 0;
                if (type == 1) {
                    is_liked = news.getDataValue('is_liked') ? 1 : 0;
                }
                return {
                    id: news.id,
                    title: news.title,
                    subtitle: news.subtitle,
                    file_url: news.file_url,
                    liked_count: news.liked_count,
                    is_liked: is_liked,
                    createdAt: news.createdAt
                }
            });

            const data = {
                news: newsList,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_NEWS = async (req, res) => {
        console.log("******************** UserID =============", req.user_id);
        const lockKey = `lock:get_news:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 100);
            const offset = this.getOffset(page, perPage);
            const type = req.query.type || 0;

            if (type >= 0) {
                const news = await this.redisHelper.getValue(`news_${page}_${perPage}_${offset}_${type}`);
                if (news) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', JSON.parse(news));
                }
            }

            let conditions = {
                status: 'APPROVED',
                contain_sensitive_word: 0,
                type: type ? type : { [Op.in]: [2, 3] }
            };

            const attributes = [
                'id',
                'title',
                'subtitle',
                'file_url',
                'liked_count',
                'createdAt',
                [
                    Sequelize.literal(`
                        EXISTS (
                            SELECT 1
                            FROM news_likes nl
                            WHERE nl.news_id = News.id
                            AND nl.user_id = :userId
                        )
                    `),
                    'is_liked'
                ]
            ]

            const { rows, count } = await News.findAndCountAll({
                where: conditions,
                attributes,
                replacements: {
                    userId: req.user_id
                },
                order: [['id', 'DESC']],
                limit: perPage,
                offset
            })

            const data = {
                news: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            if (type >= 0) {
                const expiry = type == 1 ? 60 : 600; // type 1 cache for 60 seconds, type 2 & 3 cache for 600 seconds
                await this.redisHelper.setValue(`news_${page}_${perPage}_${offset}_${type}`, JSON.stringify(data), expiry); // cache for 600 seconds
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_NEWS_SIGN_URL = async (req, res) => {
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
            errLogger(`[NEWS][GET_NEWS_SIGN_URL]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {}); 
        }
    }

    UPLOAD_NEWS_PIC = async (req, res) => {
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
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请选图片', {});
                }

                // Upload to AliOSS
                const dir = `uploads/news/`;
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
            errLogger(`[UPLOAD_NEWS_PIC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    POST_NEWS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const lastDenied = await News.findOne({
                where: {
                    user_id: userId,
                    deniedAt: {
                        [Op.gt]: threeDaysAgo // denied within last 3 days
                    }
                },
                order: [['deniedAt', 'DESC']]
            });

            // If found → still blocked
            if (lastDenied) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您有被拒绝的内容，请在3天后再尝试发布', {});
            }

            // Check today post count
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            const todayPostCount = await News.count({
                where: {
                    user_id: userId,
                    createdAt: {
                        [Op.between]: [startOfToday, endOfToday]
                    }
                }
            });
            if (todayPostCount >= 1) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您今天已发布过内容，请明天再试', {});
            }

            // const totalPending = await News.count({
            //     where: { user_id: userId, status: 'PENDING' }
            // }) || 0;
            // if (totalPending >= 2) {
            //     return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您只能进行最多二次审核', {});
            // }

            const { type, title, content, file_url } = req.body;

            const sensitive_word = await this.redisHelper.getValue('sensitive_word');
            let arr = [];
            if (sensitive_word) {
                try {
                    arr = JSON.parse(sensitive_word);
                } catch (e) {
                    const conf = await Config.findOne({ where: { type: 'sensitive_word' }, attributes: ['val'] });
                    if (conf) {
                        arr = JSON.parse(conf.val);
                    }
                }
            }
            let contain_sensitive_word = 0;
            for (let word of arr) {
                if (content.includes(word)) {
                    contain_sensitive_word = 1;
                    break;
                }
            }

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, { attributes: ['id', 'relation', 'today_news_award_count', 'masonic_fund', 'balance'], transaction: t });
                await News.create({ 
                    type, 
                    title: content, 
                    content: '-', 
                    file_url, 
                    user_id: userId, 
                    relation: user.relation, 
                    contain_sensitive_word,
                    status: 'APPROVED' // Auto approve for now
                }, { transaction: t });

                // Maximum reward per day: 2 (能量论坛)
                if (type == 1 && user.today_news_award_count < 2) { 
                    let rewardTypes = await this.redisHelper.getValue('reward_types');
                    if (rewardTypes) {
                        rewardTypes = JSON.parse(rewardTypes);
                    } else {
                        rewardTypes = await RewardType.findAll({});
                        await this.redisHelper.setValue('reward_types', JSON.stringify(rewardTypes));
                    }
                    rewardTypes = rewardTypes.filter(r => r.is_energy_forum == 1 && r.status == 1);
                    const typeIds = rewardTypes.map(r => r.id);
                    const randArr = [...typeIds, 9];
                    let randNum;
                    do {
                        randNum = this.getRandomInt(1, 10);
                    } while (!randArr.includes(randNum));

                    if (randNum == 9) {
                        // 经验值
                        let conf = await this.redisHelper.getValue('news_random_rankpoint');
                        if (!conf) {
                            const config = await Config.findOne({ where: { type: 'news_random_rankpoint' }, attributes: ['val'], transaction: t });
                            await this.redisHelper.setValue('news_random_rankpoint', config.val);
                            conf = config.val;
                        }
                        const split = JSON.parse(conf);
                        if (split.length >= 2) {
                            const rankPoint = this.getRandomInt(split[0], split[1]);
                            if (rankPoint > 0) {
                                await user.increment({ rank_point: rankPoint, today_news_award_count: 1 }, { transaction: t });
                                await UserRankPoint.create({ from: 1, to: user.id, amount: rankPoint, type: 2, relation: user.relation }, { transaction: t });
                            }
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
                                from_where: `发布能量论坛 获得共济基金`
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 1 },
                                transaction: t
                            });
                            await user.increment({ masonic_fund: amount, today_news_award_count: 1 }, { transaction: t });
                        }

                    } else if(randNum == 2) {
                        // 上合战略黄金持有克数
                        const reward = rewardTypes.find(r => r.id == 2);
                        if (reward.remain_count > 0) {
                            const now = new Date();
                            const validUntil = new Date(now);
                            validUntil.setMonth(validUntil.getMonth() + 3);
                            const obj = {
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: reward.id,
                                amount: this.getRandomInt(reward.amount_min, reward.amount_max),
                                validedAt: validUntil,
                                from_where: `发布能量论坛 获得上合战略黄金持有克数`,
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 2 },
                                transaction: t
                            });
                            await user.increment({ today_news_award_count: 1 }, { transaction: t });
                        }
                    } else if (randNum == 3) {
                        // 账户余额
                        const reward = rewardTypes.find(r => r.id == 3);
                        if (reward.remain_count > 0) {
                            const amount = this.getRandomInt(reward.amount_min, reward.amount_max);
                            const obj = {
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: reward.id,
                                amount: amount,
                                before_amount: user.balance,
                                after_amount: Number(user.balance) + Number(amount),
                                from_where: `发布能量论坛 获得账户余额`,
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 3 },
                                transaction: t
                            });
                            await user.increment({ balance: amount, masonic_fund: -amount, today_news_award_count: 1 }, { transaction: t });
                        }
                    } else if(randNum == 4) {
                        // 上合组织各国授权书
                        const reward = rewardTypes.find(r => r.id == 4);
                        if (reward.remain_count > 0) {
                            const obj = {
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: reward.id,   
                                amount: 100,
                                from_where: `发布能量论坛 获得上合组织各国授权书`,
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 4 },
                                transaction: t
                            });
                            await user.increment({ today_news_award_count: 1 }, { transaction: t });
                        }
                    } else if (randNum == 6) {
                        // 上合组织中国区授权书
                        const reward = rewardTypes.find(r => r.id == 6);
                        if (reward.remain_count > 0) {
                            const obj = {
                                user_id: user.id,
                                relation: user.relation,
                                reward_id: reward.id,
                                amount: 100,
                                from_where: `发布能量论坛 获得上合组织中国区授权书`,
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 6 },
                                transaction: t
                            });
                            await user.increment({ today_news_award_count: 1 }, { transaction: t });
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
                                from_where: `发布能量论坛 获得上合战略储备黄金券`,
                            }
                            await RewardRecord.create(obj, { transaction: t });
                            await RewardType.update({ remain_count: reward.remain_count - 1 }, {
                                where: { id: 7 },
                                transaction: t
                            });
                            await user.increment({ today_news_award_count: 1 }, { transaction: t });
                        }
                        
                    } else if (randNum == 8) {
                        // 推荐金提取券
                        const reward = rewardTypes.find(r => r.id == 8);
                        if (reward.remain_count > 0) {
                            const settings = reward.settings ? JSON.parse(reward.settings) : [];
                            if (settings.length > 0) {
                                // Pick a random setting
                                const amountArr = settings.map(s => s.amount).filter(a => a.total_count > 0);
                                if (amountArr.length > 0) {
                                    let randIndex;
                                    do {
                                        randIndex = this.getRandomInt(amountArr[0], amountArr[amountArr.length - 1]);
                                    } while (!amountArr.includes(randIndex));

                                    const setting = settings.find(s => s.amount == randIndex);
                                    if (setting && setting.total_count > 0) {
                                        const amount = setting.amount;
                                        const obj = {
                                            user_id: user.id,
                                            relation: user.relation,
                                            reward_id: reward.id,
                                            amount: amount,
                                            from_where: `发布能量论坛 获得推荐金提取券`
                                        }
                                        await RewardRecord.create(obj, { transaction: t });

                                        setting.total_count -= 1;
                                        await RewardType.update({ settings: JSON.stringify(settings) }, {
                                            where: { id: 8 },
                                            transaction: t
                                        });
                                        await user.increment({ today_news_award_count: 1 }, { transaction: t });
                                    }
                                }
                            }
                        }
                    }
                }

                await t.commit();
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '发布成功', {});
            } catch (error) {
                await t.rollback();
                errLogger(`[POST_NEWS]: ${error.stack}`);
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '发布失败', {});
            }
            
        } catch (error) {
            errLogger(`[UPLOAD_NEWS_PIC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    NEWS_DETAILS = async (req, res) => {
        try {
            const news = await News.findByPk(req.params.id, {
                where: { status: 1 },
                attributes: ['id', 'title', 'subtitle', 'content', 'file_url', 'createdAt']
            });

            if (!news) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', news);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    LIKE_NEWS = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'relation'] });

            const news = await News.findByPk(req.params.id, { attributes: ['id', 'liked_count'] });
            if (!news) {
                return MyResponse(req, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const t = await db.transaction();
            try {
                const likes = await NewsLikes.findOne({
                    where: { user_id: userId, news_id: news.id },
                    attributes: ['id'],
                    transaction: t
                });

                let change = 0;
                if (!likes) {
                    await NewsLikes.create({ user_id: userId, news_id: news.id, relation: user.relation }, { transaction: t });
                    change = 1;
                } else {
                    await likes.destroy({ transaction: t });
                    change = -1;
                }

                await news.increment({ liked_count: change }, { transaction: t });

                await t.commit();
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '点赞成功', {});
            } catch (error) {
                errLogger(`[LIKE_NEWS]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '操作失败', {});
            }
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REPORT_NEWS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'relation'] });

            const { description } = req.body;
            const news = await News.findByPk(req.params.id, { attributes: ['id', 'reported_count'] });
            if (!news) {
                return MyResponse(req, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const t = await db.transaction();
            try {
                // Try to create like; if already exists, do nothing
                const [like, created] = await NewsReports.findOrCreate({
                    where: { user_id: userId, news_id: news.id },
                    defaults: { user_id: userId, news_id: news.id, description, relation: user.relation },
                    transaction: t
                });

                if (!created) {
                    // Already liked
                    await t.rollback();
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您已举报过', {});
                }

                // Increment liked count
                await news.increment({ reported_count: 1 }, { transaction: t });

                await t.commit();
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '举报成功', {});
            } catch (error) {
                errLogger(`[LIKE_NEWS]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '操作失败', {});
            }

        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CERTIFICATES = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            const { rows, count } = await Certificate.findAndCountAll({
                where: {
                    status: 1
                },
                include: [{
                    model: UserCertificate,
                    as: 'user_certificates',
                    required: false,          // LEFT JOIN
                    where: {
                        user_id: req.user_id
                    },
                    attributes: []
                }],
                // 🔴 THIS IS THE KEY FIX
                having: Sequelize.literal('COUNT(user_certificates.id) = 0'),
                group: ['Certificate.id'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset,
                subQuery: false
            });

            const data = {
                certificates: rows,
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

    MY_CERTIFICATES = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const historyTab = parseInt(req.query.historyTab || 1); // 1 => Not use yet | 2 => Already Used
            const userId = req.user_id;

            let conditions = {
                user_id: userId,
                get_time: { [Op.ne]: null },
                use_time: { [Op.eq]: null },
            };
            if (historyTab == 2) {
                conditions.use_time = { [Op.ne]: null }
            }

            const { rows, count } = await UserCertificate.findAndCountAll({
                include: {
                    model: Certificate,
                    as: 'certificate',
                    attributes: ['title', 'pic', 'description']
                },
                where: conditions,
                attributes: ['id', 'certificate_id', 'get_time', 'use_time'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const certificates = rows.map((cert) => {
                return {
                    id: cert.id,
                    certificate_id: cert.certificate_id,
                    title: cert.certificate.title,
                    pic: cert.certificate.pic,
                    get_time: cert.get_time,
                    use_time: cert.use_time,
                    description: cert.certificate.description
                }
            });

            const data = {
                certificates: certificates,
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

    PICK_CERTIFICATE = async (req, res) => {
        try {
            const userId = req.user_id;
            const certificateId = req.params.id;

            const user = await User.findByPk(userId, { attributes: ['id', 'relation'] });

            const user_certificate = await UserCertificate.findOne({
                where: { user_id: userId, certificate_id: certificateId },
                attributes: ['id']
            });

            if (user_certificate) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '证书已领取', {});
            }

            await UserCertificate.create({
                relation: user.relation,
                user_id: userId,
                certificate_id: certificateId,
                get_time: new Date()
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '领取证书成功', {});
        } catch (error) {
            errLogger(`[PICK_CERTIFICATE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    USE_CERTIFICATE = async (req, res) => {
        try {
            const userId = req.user_id;
            const id = req.params.id;

            const user_certificate = await UserCertificate.findOne({
                where: {
                    id: id,
                    user_id: userId,
                },
                attributes: ['id', 'use_time']
            });
            if (!user_certificate) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未领取该证书', {});
            }
            if (user_certificate.use_time) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '证书已使用', {});
            }

            await user_certificate.update({ use_time: new Date() });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '使用证书成功', {});
        } catch (error) {
            errLogger(`[USE_CERTIFICATE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    INFORMATION_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            const { rows, count } = await Information.findAndCountAll({
                where: { status: 1 },
                attributes: ['id', 'title', 'subtitle', 'content', 'pic', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                informations: rows,
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

    GET_DIGITAL_AGREEMENT = async (req, res) => {
        try {
            let agreement = await this.redisHelper.getValue('digital_agreement');
            if (!agreement) {
                const config = await Config.findOne({ where: { type: 'digital_agreement' }, attributes: ['val'] });
                await this.redisHelper.setValue('digital_agreement', config.val);
                agreement = config.val;
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { agreement: agreement });
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SIGN_AGREEMENT = async (req, res) => {
        try {
            const user = await User.findByPk(req.user_id, {
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['dob', 'nrc_number', 'status']
                },
                attributes: ['id', 'agreement_status', 'reserve_fund', 'relation']
            });
            if (user.agreement_status === 'PENDING') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `申请中`, {});
            } else if (user.agreement_status === 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `已通过`, {});
            } else if (user.agreement_status === 'DENIED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `已拒绝`, {});
            }

            if (!user.kyc) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `请验证实名`, {});
            }
            if (user.kyc.status === 'PENDING') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `实名申请中，请稍后再试`, {});
            }
            if (user.kyc.status !== 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, `实名未通过`, {});
            }

            if (parseFloat(user.reserve_fund) < 100) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '储备金不足！您需要缴纳100元，请稍后再试', {});
            }

            // Serial number generation
            // Current date
            const now = new Date();
            const year = String(now.getFullYear()).slice(-2); // get last 2 digits
            const month = String(now.getMonth() + 1).padStart(2, '0');

            // DOB
            const dobDate = new Date(user.kyc.dob);
            const dobYear = String(dobDate.getFullYear()).slice(-2);
            const dobMonth = String(dobDate.getMonth() + 1).padStart(2, '0');

            // NRC last 4 digits
            const nrcLast4 = user.kyc.nrc_number.slice(-4);

            // Combine all parts
            const serial_number = `SH${year}${month}${dobYear}${dobMonth}${nrcLast4}`;

            const t = await db.transaction();
            try {
                const level_up_pay = 100;
                await user.update({
                    serial_number: serial_number,
                    agreement_status: 'APPROVED',
                    reserve_fund: parseFloat(user.reserve_fund) - level_up_pay,
                    level_up_pay: level_up_pay,
                    political_vetting_status: 'APPROVED',
                    rank_id: 2 // 预备役
                }, { transaction: t });
                await RankHistory.create({ rank_id: 2, user_id: user.id }, { transaction: t });

                await Transfer.create({
                    relation: user.relation,
                    user_id: user.id,
                    wallet_type: 9, // 缴纳保证金
                    amount: level_up_pay,
                    from: 1, // reserve_fund
                    to: 9, // level_up_pay
                    before_from_amount: Number(user.reserve_fund),
                    after_from_amount: Number(parseFloat(user.reserve_fund) - level_up_pay),
                    before_to_amount: Number(user.level_up_pay),
                    after_to_amount: Number(parseFloat(user.level_up_pay) + level_up_pay),
                    status: 'APPROVED'
                }, { transaction: t });

                // /1/2/7/10/12/13/14
                const arr = user.relation.split("/").filter(v => v).slice(1, -1).map(Number); // [2,7,10,12,13]
                const relArr = arr.reverse(); // [13,12,10,7,2]

                const rankPoints = [];
                const parents = await User.findAll({
                    where: {
                        id: { [Op.in]: relArr }
                    },
                    attributes: ['id']
                }, { transaction: t });

                // Points per level
                const levelAmounts = [90, 45, 9]; // First three levels
                const defaultAmount = 4.5;       // Remaining levels

                for (let i = 0; i < relArr.length; i++) {
                    const parentId = relArr[i];
                    const amount = levelAmounts[i] ?? defaultAmount; // Use default if beyond defined levels

                    rankPoints.push({ type: 3, from: user.id, to: parentId, amount, relation: user.relation });

                    const parent = parents.find(p => p.id == parentId);
                    if (parent) {
                        await parent.increment({ rank_point: amount }, { transaction: t });
                    }
                }

                // Bulk create all rank points at once
                if (rankPoints.length > 0) {
                    await UserRankPoint.bulkCreate(rankPoints, { transaction: t });
                }

                // Give 20g of gold coupon
                const now = new Date();
                const validUntil = new Date(now);
                validUntil.setMonth(validUntil.getMonth() + 3);
                await RewardRecord.create({
                    user_id: user.id,
                    relation: user.relation,
                    reward_id: 7, // 上合战略储备黄金券
                    amount: 20,
                    is_used: 0,
                    validedAt: validUntil,
                    from_where: `签署电子协议 获得上合战略储备黄金券`
                }, { transaction: t });

                await t.commit();

            } catch (error) {
                console.log(error);
                errLogger(`[SIGN_AGREEMENT]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '审核失败', {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '签署电子协议成功', {});
        } catch (error) {
            console.log(error);
            errLogger(`[SIGN_AGREEMENT][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_WELCOME_MESSAGE = async (req, res) => {
        try {
            const user = await User.findByPk(req.user_id, { attributes: ['name', 'rank_id'] });
            const now = new Date();
            const hour = now.getHours();
            let timeOfDay = '';
            if (hour >= 5 && hour < 12) {
                timeOfDay = '早上好';
            } else if (hour >= 12 && hour < 17) {
                timeOfDay = '下午好';
            } else if (hour >= 17 && hour < 21) {
                timeOfDay = '晚上好';
            } else {
                timeOfDay = '晚安';
            }

            const ranks = await Rank.findAll({
                attributes: ['id', 'name', 'point', 'pic', 'welcome_message'],
                order: [['id', 'ASC']]
            });

            const currentRankIndex = ranks.findIndex(r => r.id === user.rank_id);
            const currentRank = ranks[currentRankIndex];
            const nextRank = ranks.find(r => r.point > ranks[currentRankIndex].point);

            const obj = {
                name: user.name,
                time: timeOfDay,
                rank_level: currentRank.name,
                rank_pic: currentRank.pic,
                message: currentRank.welcome_message,
                next_rank_level: nextRank ? nextRank.name : '已达到最高军衔'
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', obj);
        } catch (error) {
            console.log(error)
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GENERATE_RED_ENVELOP = async (req, res) => {
        const lockKey = `lock:generate-red-envelope:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 5);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }
            
            const now = new Date();
            const minutes = now.getMinutes();

            if (minutes > 5 && minutes < 58) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '时间已超时', {});
            }

            const userId = req.user_id;
            // Check Reward Already Exist
            const rewardExist = await this.redisHelper.getValue(`UID_${userId}_reward`);
            if (rewardExist) {
                await this.redisHelper.setValue(`UID_${userId}_reward`, rewardExist, 5 * 60); // refresh expiry to 5 minutes
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', JSON.parse(rewardExist));
            }

            // Check Limit is reach
            const user = await User.findOne({
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['id', 'status']
                },
                where: { id: userId },
                attributes: ['id', 'win_per_day', 'can_get_red_envelop', 'relation'],
                useMaster: userId % 2 === 0 ? true : false
            })
            // check kyc status is approved
            if (!user.kyc || user.kyc.status !== 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '实名未通过', {});
            }

            if (user.can_get_red_envelop == 0) {
                // 已达上限
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未中奖', {});
            }

            let winLimit = 0;
            if (user.win_per_day > 0) {
                winLimit = user.win_per_day;
            } else {
                const win_per_day = await this.redisHelper.getValue('win_per_day');
                if (win_per_day) {
                    winLimit = win_per_day;
                } else {
                    const config = await Config.findOne({ where: { type: 'win_per_day' }, attributes: ['val'] });
                    winLimit = config.val;
                    await this.redisHelper.setValue('win_per_day', winLimit);
                }
            }

            const startOfToday = new Date();
            const endOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            endOfToday.setHours(23, 59, 59, 999);
            const totalTodayRecord = await RewardRecord.count({
                where: {
                    user_id: userId,
                    createdAt: {
                        [Op.between]: [startOfToday, endOfToday]
                    }
                },
                useMaster: userId % 2 === 0 ? true : false
            }) ?? 0;

            if (totalTodayRecord == winLimit) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未中奖', {});
            }

            let rewardTypes = await this.redisHelper.getValue('reward_types');
            if (rewardTypes) {
                rewardTypes = JSON.parse(rewardTypes);
            } else {
                rewardTypes = await RewardType.findAll({});
                await this.redisHelper.setValue('reward_types', JSON.stringify(rewardTypes));
            }
            // remove 8 from pool first
            rewardTypes = rewardTypes.filter(r => r.id != 8 && r.status == 1);

            // 每种授权书每个人只能获得一次
            const haveReward6 = await this.redisHelper.getValue(`USER_HAVE_REWARD_6_${userId}`);
            if (haveReward6) {
                // Already won id 6 before, remove from pool
                // 上合组织中国区授权书
                rewardTypes = rewardTypes.filter(r => r.id != 6);
            } else {
                // 需要伞下用户三代或者以上才能有机会抽中
                // downline => /userId/xx/xx/xx
                const haveDownlineLength3 = await this.redisHelper.getValue(`DOWNLINE_LENGTH_${userId}`);
                if (!haveDownlineLength3) {
                    const longestDownline = await User.findOne({
                        where: {
                            relation: { [Op.like]: `${user.relation}/%` }    
                        },
                        attributes: ['relation'],
                        order: [[Sequelize.fn('LENGTH', Sequelize.col('relation')), 'DESC']]
                    });
                    let downlineLength = 0;
                    if (longestDownline) {
                        // assume userId is 42 for testing
                        const splited = longestDownline.relation.split('/').filter(v => v); // /2/42/53/75/76 => ['2','42','53','75','76']
                        const userIdIndex = splited.indexOf(String(userId)); // 1
                        // only get Id after userId
                        const downlineAfterUser = splited.slice(userIdIndex + 1); // ['53','75','76']
                        downlineLength = downlineAfterUser.length; // 3
                    }
                    if (downlineLength < 3) {
                        // remove id 6 from pool
                        rewardTypes = rewardTypes.filter(r => r.id != 6);
                    } else {
                        // No expiry, just set once
                        await this.redisHelper.setValue(`DOWNLINE_LENGTH_${userId}`, downlineLength);
                    }
                }
            }

            let reward = null;
            let randomNum;
            let attempts = 0;
            const MAX_ATTEMPTS = 1000;
            while (!reward && attempts < MAX_ATTEMPTS) {
                randomNum = this.getRandomInt(1, 100);
                reward = rewardTypes.find(r => randomNum >= r.range_min && randomNum <= r.range_max);
                attempts++;
            }

            if (!reward) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未中奖', {});
            }
            if (reward.id != 5 && reward.remain_count <= 0) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '红包已领完，请等待下一个红包雨到来', {});
            }

            // Must be win 3 times per day
            if (totalTodayRecord <= 2) {
                // Must be win if reward id is 5
                let mastWinAttempts = 0;
                while ((!reward && mastWinAttempts < MAX_ATTEMPTS) || reward.id == 5) {
                    randomNum = this.getRandomInt(1, 100);
                    reward = rewardTypes.find(r => randomNum >= r.range_min && randomNum <= r.range_max);
                    mastWinAttempts++;
                }
            }

            let masonic_fund = 0;
            let balance_fund = 0;
            let referral_fund = 0;
            let gold_fund = 0;
            let gold_gram = 0;
            let authorize_letter_amount = 0;
            if (reward.id == 1) {
                // 共济基金
                masonic_fund = this.getRandomInt(reward.amount_min, reward.amount_max);
            } else if(reward.id == 2) {
                // 上合战略黄金持有克数
                gold_gram = this.getRandomInt(reward.amount_min, reward.amount_max);
            } else if (reward.id == 3) {
                // 余额
                balance_fund = this.getRandomInt(reward.amount_min, reward.amount_max);
            } else if(reward.id == 6) {
                // 上合组织中国区授权书
                authorize_letter_amount = 100; // Fixed amount
            } else if (reward.id == 7) {
                // 上合战略储备黄金券
                gold_fund = this.getRandomInt(reward.amount_min, reward.amount_max);
            } else if (reward.id == 8) {
                // 推荐金提取券
                referral_fund = this.getRandomInt(reward.amount_min, reward.amount_max);
            }

            const data = {
                user_id: userId,
                reward_id: reward.id,
                reward_remain_count: reward.remain_count,
                title: reward.title,
                total_reward: totalTodayRecord + 1,
                limit: winLimit,
                masonic_fund: masonic_fund,
                balance_fund: balance_fund,
                referral_fund: referral_fund,
                gold_fund: gold_fund,
                gold_gram: gold_gram,
                authorize_letter_amount: authorize_letter_amount
            }
            await this.redisHelper.setValue(`UID_${userId}_reward`, JSON.stringify(data), 5 * 60); // 5 minutes

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[GENERATE_RED_ENVELOP][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_RED_ENVELOP = async (req, res) => {
        const lockKey = `lock:get-red-envelope:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 5);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const now = new Date();
            const minutes = now.getMinutes();

            if (minutes > 15) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '时间已超时', {});
            }

            const userId = req.user_id;
            let reward = await this.redisHelper.getValue(`UID_${userId}_reward`);
            if (!reward) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '红包已过期', {});
            }
            reward = JSON.parse(reward);
            if (reward.id == 5) {
                return MyResponse(res, this.ResCode.SUCCESS.code, false, '未中奖，请下次再试', {});
            }

            const masonic_fund = reward.masonic_fund;
            const balance_fund = reward.balance_fund;
            const referral_fund = reward.referral_fund;
            const gold_fund = reward.gold_fund;
            const gold_gram = reward.gold_gram;
            const authorize_letter_amount = reward.authorize_letter_amount;
            const user = await User.findByPk(userId, { 
                attributes: ['id', 'relation', 'masonic_fund', 'balance'], 
                useMaster: userId % 2 === 0 ? true : false 
            });

            const t = await db.transaction();
            try {
                const obj = {
                    user_id: userId,
                    relation: user.relation,
                    reward_id: reward.reward_id,
                    amount: 0
                }
                if (reward.reward_id == 1) {
                    obj.amount = masonic_fund;
                    obj.before_amount = user.masonic_fund;
                    obj.after_amount = parseFloat(user.masonic_fund) + parseFloat(masonic_fund);
                    obj.from_where = `红包雨 共济基金 获得${masonic_fund}元`;
                } else if (reward.reward_id == 2) {
                    obj.amount = gold_gram;
                    const now = new Date();
                    const validUntil = new Date(now);
                    validUntil.setMonth(validUntil.getMonth() + 3);
                    obj.validedAt = validUntil;
                    obj.from_where = `红包雨 上合战略储备黄金券 获得${gold_gram}克`;
                } else if (reward.reward_id == 3) {
                    obj.amount = balance_fund;
                    obj.before_amount = user.balance;
                    obj.after_amount = parseFloat(user.balance) + parseFloat(balance_fund);
                    obj.from_where = `红包雨 余额 获得${balance_fund}元`;
                } else if (reward.reward_id == 6) {
                    obj.amount = authorize_letter_amount;
                    obj.from_where = `红包雨 上合组织中国区授权书 获得${authorize_letter_amount}`;
                    await this.redisHelper.setValue(`USER_HAVE_REWARD_6_${userId}`, 1); // No expiry
                } else if (reward.reward_id == 8) {
                    obj.amount = referral_fund;
                    obj.from_where = `红包雨 推荐金提取券 获得${referral_fund}元`;
                } else if (reward.reward_id == 7) {
                    obj.amount = gold_fund;
                    obj.from_where = `红包雨 上合战略储备黄金券 获得${gold_fund}克`;
                    const now = new Date();
                    const validUntil = new Date(now);
                    validUntil.setMonth(validUntil.getMonth() + 3);
                    obj.validedAt = validUntil;
                }
                await RewardRecord.create(obj, { transaction: t });

                if (masonic_fund > 0) {
                    await user.increment({ masonic_fund: masonic_fund }, { transaction: t });
                } else if (balance_fund > 0) {
                    await user.increment({ balance: balance_fund, masonic_fund: -balance_fund }, { transaction: t });
                }
                if (reward.total_reward == reward.limit) {
                    await user.update({ can_get_red_envelop: 0 }, { transaction: t });
                }
                
                await RewardType.update({ remain_count: reward.reward_remain_count - 1 }, {
                    where: { id: reward.reward_id },
                    transaction: t
                });
                await t.commit();
            } catch (error) {
                errLogger(`[GET_RED_ENVELOP]: ${error.stack}`);
                if (!t.finished) {
                    await t.rollback();
                }
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            await this.redisHelper.deleteKey(`UID_${userId}_reward`);
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '收红包成功', {});
        } catch (error) {
            errLogger(`[GET_RED_ENVELOP][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    RANKS = async (req, res) => {
        try {
            const ranks = await Rank.findAll({
                attributes: ['id', 'pic', 'name', 'point', 'number_of_impeach', 'allowance']
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', ranks);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REQUEST_NEXT_RANK = async (req, res) => {
        try {
            const user = await User.findByPk(req.user_id, {
                include: {
                    model: UserKYC,
                    as: 'kyc',
                    attributes: ['id', 'status']
                },
                attributes: ['id', 'serial_number', 'rank_id', 'political_vetting_status', 'rank_point']
            });
            if (user.political_vetting_status !== 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未通过', {});
            }
            if (!user.kyc || user.kyc.status !== 'APPROVED') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请验证实名', {});
            }

            const ranks = await Rank.findAll({
                attributes: ['id', 'name', 'point'],
                order: [['id', 'ASC']]
            });

            const currentRankIndex = ranks.findIndex(r => r.id === user.rank_id);
            const nextRank = ranks.find(r => r.point > ranks[currentRankIndex].point);
            if (!nextRank) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '已达到最高军衔', {});
            }
            if (user.rank_point < nextRank.point) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '需要更多邀请函', {});
            }
            if (nextRank.point == 0 && nextRank.id != 2) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '暂时不能升级', {});
            }

            const obj = { rank_id: nextRank.id }
            if (nextRank.id == 3) {
                // Start employ
                obj.startEmployed = new Date();
            }

            const t = await db.transaction();
            try {
                await user.update(obj, { transaction: t });
                await RankHistory.create({ rank_id: nextRank.id, user_id: user.id }, { transaction: t });
                await t.commit();
            } catch (error) {
                console.log(error);
                errLogger(`[REQUEST_NEXT_RANK]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '操作失败', {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '升级成功', { new_rank: { id: nextRank.id, name: nextRank.name } });
        } catch (error) {
            errLogger(`[REQUEST_NEXT_RANK][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DOWNLINE_CHILD_3_LEVEL = async (req, res) => {
        try {
            const userId = req.user_id;

            const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
            const users = await User.findAll({
                where: {
                    relation: { [Op.like]: `${me.relation}/%` }
                },
                attributes: ['id', 'name', 'relation']
            });
            const childrenIds = [];
            for (const u of users) {
                const relSplited = u.relation.split('/').filter(v => v);
                // Get index of userId
                const userIdIndex = relSplited.indexOf(String(userId));
                // Remove all before and including userId
                const downlineAfterUser = relSplited.slice(userIdIndex + 1);
                // Get first 3 level only
                const first3Level = downlineAfterUser.slice(0, 3);
                childrenIds.push(...first3Level);
            }
            const uniqueChildrenIds = [...new Set(childrenIds)];
            const children = [];
            for (let i = 0; i < uniqueChildrenIds.length; i++) {
                const findIndex = users.findIndex(u => u.id == uniqueChildrenIds[i]);
                if (findIndex != -1) {
                    children.push({
                        id: users[findIndex].id,
                        name: users[findIndex].name
                    });
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', children);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    IMPEACH_CHILD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { child_id, impeach_type, reason } = req.body;
            const userId = req.user_id;

            const parent = await User.findByPk(userId, { attributes: ['id', 'relation'] });

            const child = await User.findOne({
                include: {
                    model: User,
                    as: 'parent',
                    attributes: ['id', 'rank_id'],
                },
                where: { id: child_id, parent_id: parent.id },
                attributes: ['id']
            });
            if (!child) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '直属下级无效', {});
            }
            const rank = await Rank.findByPk(child.parent.rank_id, { attributes: ['number_of_impeach'] });
            if (rank.number_of_impeach == 0) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '暂时不能弹劾', {});
            }

            const checkImpeach = await Impeachment.findOne({
                where: {
                    parent_id: parent.id,
                    child_id: child_id,
                    status: 'PENDING'
                },
                attributes: ['id']
            });
            if (checkImpeach) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '已弹劾', {});
            }

            // Check Total Impeach this month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const totalImpeach = await Impeachment.count({
                where: {
                    parent_id: parent.id,
                    child_id: child_id,
                    createdAt: {
                        [Op.between]: [startOfMonth, endOfMonth]
                    }
                },
            });
            if (totalImpeach > rank.number_of_impeach) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '本月已达到最高弹劾数', {});
            }

            await Impeachment.create({
                relation: parent.relation,
                parent_id: parent.id,
                child_id: child_id,
                type: impeach_type,
                status: 'PENDING',
                remark: reason
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '弹劾成功', {});
        } catch (error) {
            errLogger(`[IMPEACH_CHILD][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    IMPEACH_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;

            let conditions = {
                parent_id: userId,
            };

            const { rows, count } = await Impeachment.findAndCountAll({
                include: {
                    model: User,
                    as: 'child',
                    attributes: ['name']
                },
                where: conditions,
                attributes: ['id', 'type', ['remark', 'reason'], 'status', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                impeachs: rows,
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

    ALLOWANCE_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;

            const { rows, count } = await Allowance.findAndCountAll({
                where: { user_id: userId },
                attributes: ['id', 'amount', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                allowances: rows,
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

    TICKET_LIST = async (req, res) => {
        try {
            const tickets = await Ticket.findAll({ attributes: ['id', 'name', 'price'] });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', tickets);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EXCHANGE_ALLOWANCE = async (req, res) => {
        const lockKey = `lock:exchange_allowance:${req.user_id}`;
        let redisLocked = false;

        try {
             /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const userId = req.user_id;
            const ticketId = req.params.id;

            const ticket = await Ticket.findByPk(ticketId ?? 0, { attributes: ['id', 'price'] });
            if (!ticket) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, { 
                    attributes: ['id', 'relation', 'freeze_allowance'],
                    transaction: t
                });
                if (ticket.price > user.freeze_allowance) {
                    throw new Error('预压津贴不足');
                }
                
                await user.increment({ freeze_allowance: -ticket.price }, { transaction: t });
                await TicketRecord.create({
                    relation: user.relation,
                    user_id: userId,
                    ticket_id: ticket.id,
                    price: ticket.price,
                }, { transaction: t });
                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '兑换成功', {});

            } catch (error) {
                errLogger(`[EXCHANGE_ALLOWANCE][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            errLogger(`[EXCHANGE_ALLOWANCE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EXCHANGE_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;

            const { rows, count } = await TicketRecord.findAndCountAll({
                include: {
                    model: Ticket,
                    as: 'ticket',
                    attributes: ['name']
                },
                where: { user_id: userId },
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                records: rows,
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

    INHERIT_OWNER = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { inherit_account, description, prove_url } = req.body;
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'relation'] });

            const inheritance = await User.findOne({ where: { phone_number: inherit_account } }, { attributes: ['id'] });
            if (!inheritance) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到账号', {});
            }

            let owner = await InheritOwner.findOne({
                where: { user_id: user.id, inherit_account: inherit_account },
                attributes: ['id']
            });
            if (owner) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '您已转让', {});
            }

            const t = await db.transaction();
            try {
                owner = await InheritOwner.create({
                    relation: user.relation,
                    user_id: user.id,
                    inherit_account: inherit_account,
                    description: description,
                    prove: prove_url,
                    status: 'PENDING'
                }), { transaction: t };
                await user.update({ status: 0 }, { transaction: t });
                await this.redisHelper.deleteKey(`user_token_${userId}`);
                await t.commit();
            } catch (error) {
                await t.rollback();
                errLogger(`[UPLOAD_INHERITANCE_PROVE][${userId}]: ${error.stack}`);
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '转让失败', {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '转让成功', { id: owner.id });
        } catch (error) {
            errLogger(`[INHERIT_OWNER][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD_INHERITANCE_PROVE = async (req, res) => {
        try {
            req.uploadDir = `./uploads/inheritance`;

            const upload = require('../../middlewares/UploadInheritProve');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '10MB' });
                    }
                    if (err.code == 'ENOENT') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, 'ENOENT', {});
                    }
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, err.message, {});
                } else if (err) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }

                if (req.file == null) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请选文件', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/inheritance/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/inheritance/${fileName}`);
                const { success, result } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: result.url });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[UPLOAD_INHERITANCE_PROVE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EARN_SUMMARY = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'earn'] });

            const today = new Date();

            // Yesterday Interest
            const startOfYesterday = new Date(today);
            startOfYesterday.setDate(today.getDate() - 1);
            startOfYesterday.setHours(0, 0, 0, 0);
            const endOfYesterday = new Date(today);
            endOfYesterday.setDate(today.getDate() - 1);
            endOfYesterday.setHours(23, 59, 59, 999);

            const yesterdayInterest = await Interest.findOne({
                where: {
                    user_id: userId,
                    createdAt: {
                        [Op.between]: [startOfYesterday, endOfYesterday]
                    }
                },
                attributes: ['amount']
            });

            // The day before yesterday Interest
            const startOfBeforeYesterday = new Date(today);
            startOfBeforeYesterday.setDate(today.getDate() - 2);
            startOfBeforeYesterday.setHours(0, 0, 0, 0);
            const endOfBeforeYesterday = new Date(today);
            endOfBeforeYesterday.setDate(today.getDate() - 2);
            endOfBeforeYesterday.setHours(23, 59, 59, 999);

            const beforeYesterdayInterest = await Interest.findOne({
                where: {
                    user_id: userId,
                    createdAt: {
                        [Op.between]: [startOfYesterday, endOfYesterday]
                    }
                },
                attributes: ['amount']
            });

            const totalInterest = await Interest.sum('amount', { where: { user_id: userId } });
            const yearInterestRate = (await this.redisHelper.getValue('earn_interest_rate_per_year')) || 0;
            const estimatedYearInterest = (user.earn * yearInterestRate * 0.01).toFixed(2);

            const beforeYesterdayInterestAmount = beforeYesterdayInterest ? Number(beforeYesterdayInterest.amount) : 0;


            const data = {
                rate: Number(yearInterestRate),
                total_earn: Number(user.earn),
                estimated_interest_per_year: Number(estimatedYearInterest),
                yesterday_interest: yesterdayInterest ? Number(yesterdayInterest.amount) : 0,
                yesterday_interest_percent: 0,
                total_interest: totalInterest ? Number(totalInterest) : 0
            }

            const interestDiff = ((data.yesterday_interest - beforeYesterdayInterestAmount) / data.yesterday_interest) * 100;
            data.yesterday_interest_percent = interestDiff ? Number(interestDiff) : 0;

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error)
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EARN_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;

            let yearInterestRate = await this.redisHelper.getValue('earn_interest_rate_per_year');
            if (!yearInterestRate) {
                const rate = await Config.findOne({ where: { type: 'earn_interest_rate_per_year' }, attributes: ['val'] });
                yearInterestRate = rate.val;
                await this.redisHelper.setValue('earn_interest_rate_per_year', yearInterestRate);
            }

            const user = await User.findByPk(userId, { attributes: ['earn'] });
            const yesterdayEarn = await Interest.findOne({
                where: { user_id: userId },
                attributes: ['id', 'amount'],
                order: [['id', 'DESC']],
                limit: 1
            });
            const totalInterest = await Interest.sum('amount', {
                where: { user_id: userId }
            });
            const estimatedEarn = new Decimal(user.earn)
                .times(yearInterestRate)
                .times(0.01)
                .toNumber();

            const { rows, count } = await Transfer.findAndCountAll({
                where: {
                    user_id: userId,
                    wallet_type: {
                        [Op.in]: [2, 7]
                    },
                    from: {
                        [Op.in]: [2, 7]
                    },
                    to: {
                        [Op.in]: [2, 7]
                    }
                },
                attributes: ['id', 'amount', 'from', 'to', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                yesterday_earn: Number(yesterdayEarn ? yesterdayEarn.amount : 0),
                estimated_earn: Number(estimatedEarn),
                total_interest: Number(totalInterest ?? 0),
                total_earn: Number(user.earn),
                earns: rows,
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

    MASONIC_FUND = async (req, res) => {
        try {
            const masonicFund = await this.redisHelper.getValue(`masonic_fund_summary_${req.user_id}`);
            if (masonicFund) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', JSON.parse(masonicFund));
            }

            const totalRegister = await User.count();
            const user = await User.findByPk(req.user_id, { attributes: ['id', 'masonic_fund', 'phone_number'] });

            const data = {
                fund: Number(user.masonic_fund),
                total_participant: Number(totalRegister * 111),
                total_retreiver: Number(totalRegister * 27)
            }

            await this.redisHelper.setValue(`masonic_fund_summary_${req.user_id}`, JSON.stringify(data), 60); // 10 minutes

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_MASONIC_FUND = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'relation', 'rank_id', 'masonic_fund'] });
            const reward = await RewardRecord.findOne({
                where: { user_id: userId, reward_id: 6, is_used: 0 },
                attributes: ['id', 'amount']
            });

            if (!reward) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请获取上合组织各国授权书后重试', {});
            }

            const fundHistory = await MasonicFundHistory.findOne({
                where: { 
                    user_id: userId, 
                    status: 'PENDING' 
                },
                attributes: ['id']
            });
            // Check existing pending fund history
            if (!fundHistory) {
                await MasonicFundHistory.create({
                    relation: user.relation,
                    user_id: userId,
                    amount: reward.amount,
                    status: 'PENDING'
                });
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, `请添加官方专属联系人员激活授权书领取`, {});

            // const t = await db.transaction();
            // try {
            //     await MasonicFundHistory.create({
            //         relation: user.relation,
            //         user_id: userId,
            //         amount: reward.amount,
            //         status: 'PENDING'
            //     }, { transaction: t });
            //     await reward.update({ is_used: 1 }, { transaction: t });
            //     await t.commit();

            //     return MyResponse(res, this.ResCode.SUCCESS.code, true, `恭喜您成功使用「上合组织成员国授权书」，已成功领取 ${reward.amount} 元奖励！`, {});
            // } catch (error) {
            //     errLogger(`[GET_MASONIC_FUND][${req.user_id}]: ${error.stack}`);
            //     await t.rollback();
            //     return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            // }
        } catch (error) {
            errLogger(`[GET_MASONIC_FUND][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_BANNER = async (req, res) => {
        try {
            const banners = await Banner.findAll({ attributes: ['id', 'pic'] });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', banners)
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GOLD_PRICE = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'gold', 'relation'] });

            let groupGoldCount = await this.redisHelper.getValue(`gold_price_group_count_${userId}`);
            if (!groupGoldCount) {
                groupGoldCount = await User.sum('gold', {
                    where: {
                        relation: {
                            [Op.like]: `${user.relation}/%`
                        }
                    }
                });
                await this.redisHelper.setValue(`gold_price_group_count_${userId}`, groupGoldCount, 300); // 5 minutes
            }

            let latestPrice = await this.redisHelper.getValue('gold_price_latest');
            if (latestPrice) {
                latestPrice = JSON.parse(latestPrice);
            } else {
                latestPrice = await GoldPrice.findOne({
                    attributes: ['price', 'reserve_price'],
                    order: [['id', 'DESC']],
                    limit: 1
                });
                await this.redisHelper.setValue('gold_price_latest', JSON.stringify(latestPrice), 300); // 5 minutes
            }

            let data = {
                realtime_price: 0,
                reserve_price: 0,
                personal_gold_count: 0,
                personal_gold_amount: 0,
                group_gold_count: groupGoldCount ?? 0,
                group_gold_amount: 0,
                realtime_chart: [],
                reserve_chart: []
            }
            if (!latestPrice) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
            }
            data.realtime_price = Number(latestPrice.price);
            data.reserve_price = Number(latestPrice.reserve_price);
            data.personal_gold_count = Number(user.gold);
            data.personal_gold_amount = Number(data.personal_gold_count * data.reserve_price);
            data.group_gold_amount = Number(data.group_gold_count * data.reserve_price);

            let lastSevenPrice = await this.redisHelper.getValue('gold_price_last_seven');
            if (lastSevenPrice) {
                lastSevenPrice = JSON.parse(lastSevenPrice);
            } else {
                lastSevenPrice = await GoldPrice.findAll({
                    attributes: ['price', 'reserve_price', 'createdAt'],
                    order: [['id', 'DESC']],
                    limit: 7
                })
                await this.redisHelper.setValue('gold_price_last_seven', JSON.stringify(lastSevenPrice), 1800); // 30 minutes
            }

            data.realtime_chart = lastSevenPrice.map(g => {
                return { price: g.price, date: g.createdAt }
            }).reverse();
            data.reserve_chart = lastSevenPrice.map(g => {
                return { price: g.reserve_price, date: g.createdAt }
            }).reverse();

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[GOLD_PRICE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    BUY_GOLD = async (req, res) => {
        const lockKey = `lock:buy_gold:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }
            
            const userId = req.user_id;
            const latestPrice = await GoldPrice.findOne({
                attributes: ['price'],
                order: [['id', 'DESC']],
                limit: 1
            });
            if (!latestPrice) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '黄金价格未设置', {});
            }

            if (parseFloat(latestPrice.price) <= 0) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '黄金价格未设置!', {});
            }

            const { gold_count } = req.body;
            const totalConsume = gold_count * parseFloat(latestPrice.price);

            const t = await db.transaction();
            try {
                const user = await User.findByPk(userId, {
                    attributes: ['id', 'relation', 'reserve_fund', 'gold'],
                    transaction: t 
                });
                if (totalConsume > parseFloat(user.reserve_fund)) {
                    throw new Error('储备金不足');
                }

                await UserGoldPrice.create({
                    relation: user.relation,
                    user_id: userId,
                    type: 1,
                    gold_count: gold_count,
                    amount: Number(totalConsume),
                    before_amount: Number(user.reserve_fund),
                    after_amount: Number(parseFloat(user.reserve_fund) - totalConsume)
                }, { transaction: t });
                await user.increment({ reserve_fund: -totalConsume, gold: gold_count }, { transaction: t });

                await t.commit();
            } catch (error) {
                errLogger(`[BUY_GOLD][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '买入成功', {});
        } catch (error) {
            errLogger(`[BUY_GOLD][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SELL_GOLD = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'relation', 'reserve_fund', 'gold'] });

            const latestPrice = await GoldPrice.findOne({
                attributes: ['reserve_price'],
                order: [['id', 'DESC']],
                limit: 1
            });
            if (!latestPrice) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '黄金价格未设置', {});
            }

            if (latestPrice.reserve_price <= 0) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '黄金价格未设置!', {});
            }

            const { gold_count } = req.body;
            if (parseFloat(gold_count) > parseFloat(user.gold_count)) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '黄金数量不足', {});
            }
            const totalReserve = gold_count * parseFloat(latestPrice.reserve_price);

            const t = await db.transaction();
            try {
                await UserGoldPrice.create({
                    relation: user.relation,
                    user_id: userId,
                    type: 2,
                    gold_count: gold_count,
                    amount: Number(totalReserve),
                    before_amount: Number(user.reserve_fund),
                    after_amount: Number(parseFloat(user.reserve_fund) + totalReserve)
                }, { transaction: t });
                await user.increment({ reserve_fund: parseFloat(totalReserve), gold: -parseFloat(gold_count) }, { transaction: t });

                await t.commit();
            } catch (error) {
                errLogger(`[SELL_GOLD][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, this.ResCode.DB_ERROR.msg, {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '卖出成功', {});
        } catch (error) {
            errLogger(`[SELL_GOLD][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EXCHANGE_GOLD_BY_GOLD_COUPON = async (req, res) => {
        const lockKey = `lock:exchange_gold_by_gold_coupon:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const userId = req.user_id;
            const id = req.params.id;

            const t = await db.transaction();
            try {
                const rewardRecord = await RewardRecord.findOne({
                    where: {
                        id: id,
                        user_id: userId,
                        reward_id: {
                            [Op.in]: [2, 7]
                        },
                        is_used: 0,
                    },
                    attributes: ['id', 'amount', 'validedAt'],
                    transaction: t
                });

                if (!rewardRecord) {
                    throw new Error('黄金券无效');
                }
                if (new Date(rewardRecord.validedAt) > new Date()) {
                    throw new Error('未到兑换实体黄金时间！请耐心等待');
                }
                const user = await User.findByPk(userId, { 
                    attributes: ['id', 'gold'],
                    transaction: t 
                });
                
                await rewardRecord.update({ is_used: 1 }, { transaction: t });
                await user.increment({ gold: rewardRecord.amount }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '兑换实体黄金成功', {});
            } catch (error) {
                errLogger(`[EXCHANGE_GOLD_BY_GOLD_COUPON][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || '兑换实体黄金失败', {});
            }
        } catch (error) {
            errLogger(`[EXCHANGE_GOLD_BY_GOLD_COUPON][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EXCHANGE_BALANCE_BY_GOLD_COUPON = async (req, res) => {
        const lockKey = `lock:exchange_balance_by_gold_coupon:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const userId = req.user_id;
            const id = req.params.id;

            const goldPrice = await GoldPrice.findOne({
                attributes: ['id', 'reserve_price'],
                order: [['id', 'DESC']],
            });

            if (!goldPrice) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '暂时不能提取！请耐心等待', {});
            }

            const t = await db.transaction();
            try {
                const rewardRecord = await RewardRecord.findOne({
                    where: { 
                        id: id, 
                        user_id: userId, 
                        reward_id: {
                            [Op.in]: [2, 7]
                        }, 
                        is_used: 0 
                    },
                    attributes: ['id', 'amount', 'validedAt'],
                    transaction: t
                });

                if (!rewardRecord) {
                    throw new Error('黄金券无效');
                }
                if (new Date(rewardRecord.validedAt) > new Date()) {
                    throw new Error('未到提取时间！请耐心等待');
                }

                const amount = new Decimal(rewardRecord.amount * goldPrice.reserve_price)
                    .times(80) // 80% [八折兑换为余额]
                    .times(0.01)
                    .toNumber();

                const user = await User.findByPk(userId, { 
                    attributes: ['id', 'balance'],
                    transaction: t
                });
                
                await rewardRecord.update({ is_used: 1 }, { transaction: t });
                await user.increment({ balance: Number(amount) }, { transaction: t });

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '提取成功', {});
            } catch (error) {
                errLogger(`[EXCHANGE_GOLD_BY_GOLD_COUPON][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || '提取失败', {});
            }
        } catch (error) {
            errLogger(`[EXCHANGE_GOLD_BY_GOLD_COUPON][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    BUY_SELL_GOLD_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const type = parseInt(req.query.type || 0);
            const userId = req.user_id;

            let conditions = { user_id: userId };
            if (type > 0) {
                conditions.type = type;
            }

            const { rows, count } = await UserGoldPrice.findAndCountAll({
                where: conditions,
                attributes: ['id', 'gold_count', 'amount', 'createdAt'],
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
            errLogger(`[BUY_SELL_GOLD_HISTORY][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SUPERIOR_INTERNAL_ACCOUNT = async (req, res) => {
        try {
            const userId = req.user_id;

            const user = await User.findByPk(userId, { attributes: ['id', 'relation'] });
            const relArr = user.relation.split('/').filter(id => id);
            const superiorIds = (relArr.slice(0, -1)).reverse();

            let nearestInternal = null;
            for (const id of superiorIds) {
                const superior = await User.findOne({
                    where: { id, is_internal_account: 1 },
                    attributes: ['id', 'name', 'phone_number', 'contact_info']
                });

                if (superior) {
                    nearestInternal = superior;
                    break;
                }
            }

            if (!nearestInternal) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { id: 0, name: '', phone_number: '' });
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', nearestInternal);
        } catch (error) {
            errLogger(`[SUPERIOR_INTERNAL_ACCOUNT][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GOLD_SUMMARY = async (req, res) => {
        try {
            const userId = req.user_id;
            const user = await User.findByPk(userId, { attributes: ['id', 'gold', 'gold_interest'] });

            const totalGoldCoupon = await RewardRecord.sum('amount', {
                where: { reward_id: 7, user_id: userId, is_used: 0 },
            }) || 0;
            const GoldCouponCount = await RewardRecord.count({
                where: { reward_id: 7, user_id: userId, is_used: 0 },
            }) || 0;

            const yesterdayEarn = await GoldInterest.findOne({
                where: { user_id: userId },
                attributes: ['id', 'amount'],
                order: [['id', 'DESC']],
                limit: 1
            });

            const latestPrice = await GoldPrice.findOne({
                attributes: ['price'],
                order: [['id', 'DESC']],
            });

            const goldInAmount = new Decimal(user.gold)
                .times(latestPrice ? latestPrice.price : 0)
                .toNumber();

            const data = {
                gold: Number(user.gold),
                gold_in_amount: Number(goldInAmount),
                total_gold_interest: Number(user.gold_interest),
                total_gold_coupon: Number(totalGoldCoupon),
                gold_coupon_count: Number(GoldCouponCount),
                yesterday_gold_interest: Number(yesterdayEarn ? yesterdayEarn.amount : 0)
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GOLD_COUPON_HISTORY = async (req, res) => {
        try {
            const userId = req.user_id;

            const goldPrice = await GoldPrice.findOne({
                attributes: ['id', 'price'],
                order: [['id', 'DESC']]
            });

            if (!goldPrice) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '黄金价格未设置', {});
            }

            const coupons = await RewardRecord.findAll({
                include: {
                    model: RewardType,
                    as: 'reward_type',
                    attributes: ['id', 'title']
                },
                where: { 
                    user_id: userId, 
                    reward_id: {
                        [Op.in]: [2, 7]
                    }
                },
                attributes: ['id', 'amount', 'is_used', 'validedAt', 'createdAt'],
                order: [['id', 'DESC']]
            });

            const data = coupons.map(coupon => {
                return {
                    id: coupon.id,
                    reward: coupon.reward_type,
                    // amount: new Decimal(coupon.amount)
                    //     .times(goldPrice.price),
                    amount: Number(coupon.amount),
                    is_used: coupon.is_used,
                    validedAt: coupon.validedAt,
                    createdAt: coupon.createdAt
                }
            });

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
            const userId = req.user_id;

            const { rows, count } = await GoldInterest.findAndCountAll({
                where: { user_id: userId },
                attributes: ['id', 'amount', 'createdAt'],
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

    GET_REDEMPTION_CODE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { code } = req.body;
            const userId = req.user_id;

            const redemptionCode = await RedemptCode.findOne({
                where: { code: code },
                attributes: ['id', 'user_id', 'code', 'amount', 'is_used', 'used_at', 'type']
            });
            if (!redemptionCode) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '兑换码不存在', {});
            }
            if (redemptionCode.is_used) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '兑换码已被使用', {});
            }
            if (userId !== redemptionCode.user_id) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '兑换码与账号不匹配', {});
            }

            const t = await db.transaction();
            try {
                await redemptionCode.update({
                    is_used: 1,
                    used_at: new Date()
                }, { transaction: t });
                const user = await User.findByPk(userId, { 
                    attributes: ['id'], 
                    transaction: t,
                });
                let msg = '';
                if (redemptionCode.type === 1) {
                    // 共济基金增加（输入兑换码后，增加公济基金金额）
                    await user.increment({ masonic_fund: redemptionCode.amount }, { transaction: t });
                    msg = `兑换成功: ${redemptionCode.amount}已加到共济基金`
                
                } else if (redemptionCode.type === 2) {
                    // 共济基金发放（输入兑换码后，扣除共济基金金额，添加对应金额到余额当中）
                    await user.increment({ masonic_fund: -redemptionCode.amount, balance: redemptionCode.amount }, { transaction: t });
                    msg = `兑换成功: ${redemptionCode.amount}已加到余额`;
                
                } else if (redemptionCode.type === 3) {
                    // 经验值增加（输入兑换码后，增加经验值）
                    await user.increment({ rank_point: redemptionCode.amount }, { transaction: t });
                    msg = `兑换成功: ${redemptionCode.amount}已加到经验值`;
                
                } else if (redemptionCode.type === 4) {
                    // 黄金券发放（输入兑换码后，获得指定克数的黄金券）

                    const rewardType = await RewardType.findOne({
                        where: { id: 7 },
                        attributes: ['id', 'remain_count'],
                        transaction: t
                    });
                    if (!rewardType || rewardType.remain_count <= 0) {
                        throw new Error('黄金券库存不足，无法兑换');
                    }

                    const now = new Date();
                    const validUntil = new Date(now);
                    validUntil.setMonth(validUntil.getMonth() + 3);

                    const obj = {
                        user_id: user.id,
                        relation: user.relation,
                        reward_id: rewardType.id,
                        amount: redemptionCode.amount,
                        validedAt: validUntil,
                        from_where: `兑换码 获得上合战略储备黄金券${redemptionCode.amount}克`, // 兑换码兑换
                    }
                    await RewardRecord.create(obj, { transaction: t });
                    await rewardType.increment({ remain_count: -1 }, { transaction: t });
                    msg = `兑换成功: ${redemptionCode.amount}已加到黄金券`;
                } else if (redemptionCode.type === 5) {
                    // 上合组织中国区授权书
                    await RewardRecord.create({
                        user_id: user.id,
                        relation: user.relation,
                        reward_id: 6,
                        amount: redemptionCode.amount,
                        from_where: `兑换码 获得上合组织中国区授权书一张 ${redemptionCode.amount}份`, // 兑换码兑换
                    }, { transaction: t });
                    
                    msg = `兑换成功:  获得上合组织中国区授权书一张，请添加官方专属联系人员激活授权书领取`;
                }

                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, msg, {});
            } catch (error) {
                console.log(error);
                errLogger(`[GET_REDEMPTION_CODE][${req.user_id}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, error.message || this.ResCode.DB_ERROR.msg, {});
            }
        } catch (error) {
            console.log(error);
            errLogger(`[GET_REDEMPTION_CODE][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REWARD_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            // const goldPrice = await GoldPrice.findOne({
            //     attributes: ['id', 'price'],
            //     order: [['id', 'DESC']]
            // });

            const { rows, count } = await RewardRecord.findAndCountAll({
                include: {
                    model: RewardType,
                    as: 'reward_type',
                    attributes: ['id', 'title']
                },
                where: { user_id: req.user_id },
                attributes: ['id', 'amount', 'is_used', 'validedAt', 'createdAt'],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const formattedRows = rows.map(record => {
                let amount = Number(record.amount);
                // if (record.reward_type && (record.reward_type.id == 7 || record.reward_type.id == 2) && goldPrice) {
                //     amount = new Decimal(record.amount)
                //         .times(goldPrice.price)
                //         .toNumber();
                // }
                return {
                    id: record.id,
                    reward_type: record.reward_type,
                    amount: amount,
                    is_used: record.is_used,
                    validedAt: record.validedAt,
                    createdAt: record.createdAt
                }
            });

            const data = {
                records: formattedRows,
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

module.exports = Controller;