const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const { NewChapterPackage, NewChapterPackageHistory, User, NewChapterPackageBonuses, NewChapterPackageEarn, db, CashFlow } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const AliOSS = require('../../helpers/AliOSS');
const RedisHelper = require('../../helpers/RedisHelper');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
        this.adminLogger = this.commonHelper.adminLogger;
        this.redisHelper = new RedisHelper(app);
        this.OSS = new AliOSS();
    }

    INDEX = async (req, res) => {
        try {
            const packages = await NewChapterPackage.findAll({});

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', packages);
        } catch (err) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/new_chapter_packages/`;

            const upload = require('../../middlewares/UploadImage');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '5MB' });
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

                const pkg = await NewChapterPackage.findByPk(req.params.id);
                if (!pkg) {
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/new_chapter_packages/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/new_chapter_packages/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await this.redisHelper.deleteKey(`new_chapter_packages`); // Clear cache
                    await pkg.update({ cover_image: `/uploads/new_chapter_packages/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[NewChapterPackage][UPLOAD]: ${error.stack}`);
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

            req.body.tag = req.body.tag ? req.body.tag.join('|') : '';
            await NewChapterPackage.create(req.body);

            // Log
            await this.adminLogger(req, 'NewChapterPackage', 'create');
            
            await this.redisHelper.deleteKey(`new_chapter_packages`); // Clear cache
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '创建成功', {});
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

            const pkg = await NewChapterPackage.findByPk(req.params.id);
            if (!pkg) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            req.body.tag = req.body.tag ? req.body.tag.join('|') : '';
            await pkg.update(req.body);

            // Log
            await this.adminLogger(req, 'NewChapterPackage', 'update');

            await this.redisHelper.deleteKey(`new_chapter_packages`); // Clear cache
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[NewChapterPackage][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    NEW_CHAPTER_PACKAGE_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;
            const packageId = req.query.packageId;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const is_internal_account = req.query.is_internal_account;
            const return_type = req.query.is_returned; // 1 => 共享发展金 | 2 => 上合共享金 | 3 => 本金

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }
            if (is_internal_account >= 0) {
                userCondition.is_internal_account = is_internal_account;
            }
            if (packageId) {
                condition.package_id = packageId;
            }
            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }
            if (return_type) {
                if (return_type == 1) {
                    condition.is_returned_share_dev_fund = 1;
                } else if (return_type == 2) {
                    condition.is_returned_share_amount = 1;
                } else if (return_type == 3) {
                    condition.is_returned_price = 1;
                }
            }

            const { rows, count } = await NewChapterPackageHistory.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: NewChapterPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const totalBought = await NewChapterPackageHistory.sum('price', { where: { ...condition, price: { [Op.gt]: 0 } } }) || 0;
            const boughtCount = await NewChapterPackageHistory.count({ where: { ...condition, price: { [Op.gt]: 0 } } });
            const userBoughtCount = await NewChapterPackageHistory.count({ where: { ...condition, price: { [Op.gt]: 0 } }, distinct: true, col: 'user_id' });

            const internalUserBought = await NewChapterPackageHistory.sum('price', {
                where: {
                    ...condition,
                    '$user.is_internal_account$': true
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: []
                    }
                ]
            }) || 0;
            const externalUserBought = totalBought - internalUserBought;

            const data = {
                total_bought: totalBought,
                bought_count: boughtCount,
                user_bought_count: userBoughtCount,
                internal_user_bought: internalUserBought,
                external_user_bought: externalUserBought,
                packages: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[NewChapterPackage][PACKAGE_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    NEW_CHAPTER_PACKAGE_BONUS_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }

            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] };
            }

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }

            const { rows, count } = await NewChapterPackageBonuses.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: User,
                        as: 'from_user',
                        attributes: ['id', 'name', 'phone_number']
                    },
                    {
                        model: NewChapterPackageHistory,
                        as: 'package_history',
                        attributes: [],
                        include: {
                            model: NewChapterPackage,
                            as: 'package',
                            attributes: ['id', 'product_name']
                        }
                    },
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                packages: rows,
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

    NEW_CHAPTER_PACKAGE_EARN_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const userId = req.user_id;
            const phone = req.query.phone;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;

            let condition = {}
            let userCondition = {};
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }
            }
            if (phone) {
                userCondition.phone_number = phone;
            }

            if (startTime && endTime) {
                condition.createdAt = { [Op.between]: [startTime, endTime] }
            }

            const { rows, count } = await NewChapterPackageEarn.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'phone_number'],
                        where: userCondition
                    },
                    {
                        model: NewChapterPackageHistory,
                        as: 'package_history',
                        attributes: ['id', 'price']
                    },
                    {
                        model: NewChapterPackage,
                        as: 'package',
                        attributes: ['id', 'product_name']
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                packages: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[SharingPlanPackage][EARN_HISTORY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    RELEASE_EARN = async (req, res) => {
        try {
            const historyId = req.params.id;
            const type = req.body.type; // 1 => 共享发展金 | 2 => 上合共享金 | 3 => 本金
            const history = await NewChapterPackageHistory.findByPk(historyId);
            if (!history) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '历史记录未找到', {});
            }

            const t = await db.transaction();
            try {
                const user = await User.findByPk(history.user_id, { attributes: ['id', 'relation', 'balance', 'sharing_amount'], transaction: t });
                if (!user) {
                    await t.rollback();
                    return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '用户未找到', {});
                }

                let amount = 0;
                if (type === 1) {
                    amount = history.share_dev_fund || 0;
                } else if (type === 2) {
                    amount = history.share_amount || 0;
                } else if (type === 3) {
                    amount = history.price || 0;
                }
                
                let beforeAmount = type == 2 ? Number(user.sharing_amount) : Number(user.balance);
                let afterAmount = type == 2 ? Number(user.sharing_amount) + Number(amount) : Number(user.balance) + Number(amount);

                await CashFlow.create({
                    user_id: user.id,
                    relation: user.relation,
                    wallet_type: type == 2 ? 7 : 2, // 7 上合共享金 | 2 余额
                    model: 'NewChapterPackageHistory',
                    type: `上合组织发展新篇章`,
                    amount: amount,
                    before_amount: beforeAmount,
                    after_amount: afterAmount,
                    flow_status: 'IN',
                    description: `系统手动释放 . ${history.package ? history.package.product_name : ''} . ${type === 1 ? '共享发展金' : type === 2 ? '上合共享金' : '本金'}`,
                }, { transaction: t });

                await NewChapterPackageEarn.create({
                    user_id: user.id,
                    package_id: history.package_id,
                    package_history_id: history.id,
                    type: type,
                    amount: amount,
                    description: '系统手动释放'
                }, { transaction: t });

                const updateObj = type == 2 ? { sharing_amount: Number(user.sharing_amount) + Number(amount) } : { balance: Number(user.balance) + Number(amount) };
                await user.increment(updateObj, { transaction: t });

                await t.commit();
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '释放收益成功', {});
            } catch (error) {
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, false, '释放收益失败', {});
            }
        } catch (error) {
            errLogger(`[RELEASE_EARN][${req.user_id}]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;