const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Deposit, Withdraw, User, DepositMerchant, db, PaymentMethod } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const { Op } = require('sequelize');
const XLSX = require("xlsx");
const multer = require("multer");

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
    }

    DEPOSIT_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone;
            const viewInferior = req.query.viewInferior || 0;
            const status = req.query.status;
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
            if (status >= 0) {
                condition.status = status;
            }

            let userCondition = {}
            if (phone) {
                if (viewInferior == 1) {
                    const user = await User.findOne({ where: { phone_number: phone }, attributes: ['id', 'relation'] });
                    if (user) {
                        condition.relation = {
                            [Op.like]: `${user.relation}/%`
                        }
                    } else {
                        userCondition.phone_number = phone;
                    }
                }
            }

            const { rows, count } = await Deposit.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'user',
                        include: {
                            model: User,
                            as: 'top_account',
                            attributes: ['id', 'name', 'phone_number']
                        },
                        where: userCondition,
                        attributes: ['id', 'name', 'phone_number']
                    },
                    {
                        model: DepositMerchant,
                        as: 'deposit_merchant',
                        attributes: ['id', 'name']
                    }
                ],
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                deposits: rows,
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

    WITHDRAW_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone;
            const viewInferior = req.query.viewInferior || 0;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const status = req.query.status || -1;
            const userId = req.user_id;
            const isInternalAccount = req.query.isInternalAccount || 0;

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
            if (Number(status) >= 0) {
                condition.status = Number(status);
            }

            let userCondition = {}
            if (phone) {
                if (viewInferior == 1) {
                    const user = await User.findOne({ where: { phone_number: phone }, attributes: ['id', 'relation'] });
                    if (user) {
                        condition.relation = {
                            [Op.like]: `${user.relation}/%`
                        }
                    } else {
                        userCondition.phone_number = phone;
                    }
                } else {
                    userCondition.phone_number = phone;
                }
            }
            if (Number(isInternalAccount) > 0) {
                userCondition.is_internal_account = Number(isInternalAccount);
            }

            const { rows, count } = await Withdraw.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    include: [
                        {
                            model: User,
                            as: 'top_account',
                            attributes: ['id', 'name', 'phone_number'],
                        },
                        {
                            model: PaymentMethod,
                            as: 'payment_method',
                            attributes: ['id', 'bank_card_number', 'bank_card_name', 'open_bank_name', 'ali_account_number', 'ali_account_name']
                        }
                    ],
                    where: userCondition,
                    attributes: ['id', 'name', 'phone_number', 'is_internal_account'],
                },
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                withdraws: rows,
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

    EXPORT_WITHDRAW = async (req, res) => {
        try {
            const phone = req.query.phone;
            const viewInferior = req.query.viewInferior || 0;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const status = req.query.status || -1;
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
            if (Number(status) >= 0) {
                condition.status = Number(status);
            }

            let userCondition = {}
            if (phone) {
                if (Number(viewInferior) == 1) {
                    const user = await User.findOne({ where: { phone_number: phone }, attributes: ['id', 'relation'] });
                    if (user) {
                        condition.relation = {
                            [Op.like]: `${user.relation}/%`
                        }
                    } else {
                        userCondition.phone_number = phone;
                    }
                }
            }

            const rows = await Withdraw.findAll({
                include: {
                    model: User,
                    as: 'user',
                    include: [
                        {
                            model: User,
                            as: 'top_account',
                            attributes: ['id', 'name', 'phone_number']
                        },
                        {
                            model: PaymentMethod,
                            as: 'payment_method',
                            attributes: ['id', 'bank_card_number', 'bank_card_name', 'open_bank_name', 'ali_account_number', 'ali_account_name']
                        }
                    ],
                    where: userCondition,
                    attributes: ['id', 'name', 'phone_number', 'is_internal_account'],
                },
                where: condition,
                order: [['id', 'DESC']],
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', rows);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    IMPORT_WITHDRAW = async (req, res) => {
        try {
            req.uploadDir = `./uploads/excels`;

            const upload = require('../../middlewares/UploadExcel');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '50MB' });
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

                const filePath = req.file.path;
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                const excelData = XLSX.utils.sheet_to_json(sheet);
                // console.log(excelData);
                const t = await db.transaction();
                try {
                    for (let i = 0; i < excelData.length; i++) {
                        const row = excelData[i];
                        const id = row['提现编号'];
                        const status = row['审核状态1通过2拒绝']; // 0 => PENDIGN | 1 => SUCCESS | 2 => FAILED
                        const description = row['不通过原因'];

                        const withdraw = await Withdraw.findOne({ 
                            where: { 
                                id: id,
                                status: 0
                            }, 
                            attributes: ['id', 'user_id', 'amount'], 
                            transaction: t,
                        });
                        const obj = {
                            status: status,
                            description: description
                        }
                        if (withdraw) {
                            if (Number(status) == 2) {
                                // Do refund
                                const user = await User.findOne({
                                    where: { id: withdraw.user_id },
                                    attributes: ['id', 'balance'],
                                    transaction: t,
                                });
                                await user.increment({ balance: withdraw.amount }, { transaction: t });
                            }
                            await withdraw.update(obj, { transaction: t });
                        }
                    }

                    await t.commit();
                } catch (error) {
                    errLogger(`[IMPORT_WITHDRAW]: ${error.stack}`);
                    await t.rollback();
                    return MyResponse(res, this.ResCode.DB_ERROR.code, true, '操作失败', {});
                }

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
            });
        } catch (error) {
            errLogger(`[IMPORT_WITHDRAW]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    EXPORT_WITHDRAW_BY_PHONES = async (req, res) => {
        try {
            const phone_numbers = req.body.phone_numbers; // array
            const userId = req.user_id;
            const status = req.body.status || -1;

            let condition = {}
            if (userId != 1) {
                const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
                condition.relation = { [Op.like]: `${me.relation}/%` }      
            }
            if (Number(status) >= 0) {
                condition.status = Number(status);
            }

            let userCondition = {}
            if (phone_numbers.length > 0) {
                userCondition.phone_number = { [Op.in]: phone_numbers };
            }

            const rows = await Withdraw.findAll({
                include: {
                    model: User,
                    as: 'user',
                    include: [
                        {
                            model: User,
                            as: 'top_account',
                            attributes: ['id', 'name', 'phone_number']
                        },
                        {
                            model: PaymentMethod,
                            as: 'payment_method',
                            attributes: ['id', 'bank_card_number', 'bank_card_name', 'open_bank_name', 'ali_account_number', 'ali_account_name']
                        }
                    ],
                    where: userCondition,
                    attributes: ['id', 'name', 'phone_number', 'is_internal_account'],
                },
                where: condition,
                order: [['id', 'DESC']],
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', rows);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller