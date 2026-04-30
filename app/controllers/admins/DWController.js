const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Deposit, Withdraw, User, DepositMerchant, db, PaymentMethod, CashFlow } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const { Op } = require('sequelize');
const XLSX = require("xlsx");
const multer = require("multer");
const axios = require('axios');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
        this.notifyUrl = `${process.env.CALLBACK_DOMAIN}/api/recharge-callback`;
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
            const merchantId = req.query.merchantId;
            const orderNo = req.query.orderNo;

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
            if (merchantId) {
                condition.deposit_merchant_id = merchantId;
            }
            if (orderNo) {
                condition.order_no = orderNo;
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

    REPAIR_FIALED_DEPOSIT = async (req, res) => {
        try {
            const deposit = await Deposit.findOne({
                where: {
                    id: req.params.id,
                    status: 2,
                    callback_data: {
                        [Op.ne]: null
                    }
                }
            });

            if (!deposit) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未找到信息', {});
            }
            const callbackURL = `${this.notifyUrl}/${deposit.order_no}/${deposit.deposit_merchant_id}/${deposit.user_id}`;
            const response = await axios.post(callbackURL, JSON.parse(deposit.callback_data));
            if (response.status == 200) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '操作成功', {});
            } else {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作失败', {});
            }
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    APPROVE_DEPOSIT = async (req, res) => {
        try {
            const deposit = await Deposit.findOne({
                where: {
                    id: req.params.id,
                    status: 0,
                }
            });

            if (!deposit) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未找到信息', {});
            }
            const user = await User.findOne({
                where: { id: deposit.user_id },
                attributes: ['id', 'relation', 'reserve_fund']
            });

            const t = await db.transaction();
            try {
                await deposit.update({ status: 1 }, { transaction: t });
                await user.increment({ reserve_fund: Number(deposit.amount) }, { transaction: t });
                await CashFlow.create({
                    user_id: user.id,
                    relation: user.relation,
                    wallet_type: 1,
                    model: 'Deposit',
                    type: '充值',
                    amount: Number(deposit.amount),
                    before_amount: user.reserve_fund,
                    after_amount: Number(user.reserve_fund) + Number(deposit.amount),
                    flow_status: 'IN'
                }, { transaction: t });
                await t.commit();

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '操作成功', {});
            } catch (error) {
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作失败', {});
            }
                
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    REJECT_DEPOSIT = async (req, res) => {
        try {
            const deposit = await Deposit.findOne({
                where: {
                    id: req.params.id,
                    status: 0,
                }
            });
            if (!deposit) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未找到信息', {});
            }
            await deposit.update({ status: 2 });
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '操作成功', {});
        } catch (error) {
            console.log(error);
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
            const bankCardNumber = req.query.bankCardNumber;
            const aliAccountNumber = req.query.aliAccountNumber;
            const orderNo = req.query.orderNo;

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
            if (orderNo) {
                condition.order_no = orderNo;
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

            let bankCardCondition = {}
            if (bankCardNumber) {
                bankCardCondition.bank_card_number = bankCardNumber;
            }
            if (aliAccountNumber) {
                bankCardCondition.ali_account_number = aliAccountNumber;
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
                            attributes: ['id', 'bank_card_number', 'bank_card_name', 'open_bank_name', 'ali_account_number', 'ali_account_name'],
                            where: bankCardCondition
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

            const canWithdrawUserCount = await User.count({
                where: {
                    balance: {
                        [Op.gte]: 100
                    }
                }
            });

            const data = {
                withdraws: rows,
                can_withdraw_user_count: Number(canWithdrawUserCount || 0),
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

    REJECT_WITHDRAW = async (req, res) => {
        try {
            const withdraw = await Withdraw.findOne({
                where: {
                    id: req.params.id,
                    status: 0,
                },
                attributes: ['id', 'user_id', 'amount']
            });
            if (!withdraw) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '未找到信息', {});
            }
            const t = await db.transaction();
            try {
                await withdraw.update({ status: 2 }, { transaction: t });
                const user = await User.findOne({ where: { id: withdraw.user_id }, attributes: ['id', 'relation', 'balance'], transaction: t });
                await user.increment({ balance: Number(withdraw.amount) }, { transaction: t });
                await CashFlow.create({
                    user_id: user.id,
                    relation: user.relation,
                    wallet_type: 2,
                    model: 'Withdraw',
                    type: '提现',
                    amount: Number(withdraw.amount),
                    before_amount: user.balance,
                    after_amount: Number(user.balance) + Number(withdraw.amount),
                    flow_status: 'IN',
                    description: '退款提现金额'
                }, { transaction: t });

                await t.commit();
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '操作成功', {});
            } catch (error) {
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作失败', {});
            }
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
            const isInternalAccount = req.query.isInternalAccount || 0;
            const bankCardNumber = req.query.bankCardNumber;
            const aliAccountNumber = req.query.aliAccountNumber;
            const orderNo = req.query.orderNo;

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
            if (orderNo) {
                condition.order_no = orderNo;
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

            let bankCardCondition = {}
            if (bankCardNumber) {
                bankCardCondition.bank_card_number = bankCardNumber;
            }
            if (aliAccountNumber) {
                bankCardCondition.ali_account_number = aliAccountNumber;
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
                            attributes: ['id', 'bank_card_number', 'bank_card_name', 'open_bank_name', 'ali_account_number', 'ali_account_name'],
                            where: bankCardCondition
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
                        if (!id) {
                            continue;
                        }

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
                                    attributes: ['id', 'relation', 'balance'],
                                    transaction: t,
                                });
                                await user.increment({ balance: withdraw.amount }, { transaction: t });

                                await CashFlow.create({
                                    user_id: user.id,
                                    relation: user.relation,
                                    wallet_type: 2,
                                    model: 'Withdraw',
                                    type: '提现',
                                    amount: Number(withdraw.amount),
                                    before_amount: user.balance,
                                    after_amount: Number(user.balance) + Number(withdraw.amount),
                                    flow_status: 'IN',
                                    description: '退款提现金额'
                                }, { transaction: t });
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