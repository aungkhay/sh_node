const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { DepositMerchant } = require('../../models');
const MerchantChannel = require('../../models/MerchantChannel');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
        this.redisHelper = new RedisHelper(app);
    }

    INDEX = async (req, res) => {
        try {
            const status = req.query.status || null;

            let condition = {};
            if (status !== null) {
                condition.status = status;
            }

            const merchants = await DepositMerchant.findAll({
                where: condition,
                attributes: ['id', 'name', 'api', 'app_id', 'app_code', 'status', 'createdAt', 'updatedAt'],
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', merchants);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHANGE_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const id = req.params.id;
            const { status } = req.body;
            const merchant = await DepositMerchant.findOne({ where: { id: id } });
            if (!merchant) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '商户不存在', {});
            }

            await merchant.update({ status: status });

            await MerchantChannel.update(
                { status: status },
                { where: { deposit_merchant_id: id } }
            );

            // Log
            await this.adminLogger(req, 'DepositMerchant', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    PAYMENT_METHOD = async (req, res) => {
        try {
            const depositMethods = await this.redisHelper.getValue('deposit_methods');
            if (depositMethods) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, JSON.parse(depositMethods));
            }
            
            const methods = [
                { id: 1, name: '微信' },
                { id: 2, name: '支付宝' },
                { id: 3, name: '云闪付' },
                { id: 4, name: '银联' },
            ]
            await this.redisHelper.setValue('deposit_methods', JSON.stringify(methods));

            return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, methods);
        } catch (error) {
            this.adminLogger(`[DEPOSIT_METHOD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHANNEL_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const merchantId = req.query.merchantId;
            const paymentMethod = req.query.paymentMethod || 0;

            let condition = {};
            if (merchantId) {
                condition.deposit_merchant_id = merchantId;
            }
            if (paymentMethod) {
                condition.payment_method = paymentMethod;
            }

            const { count, rows } = await MerchantChannel.findAndCountAll({
                where: condition,
                include: {
                    model: DepositMerchant,
                    as: 'deposit_merchant',
                    attributes: ['id', 'name']
                },
                offset: offset,
                limit: perPage,
                order: [['createdAt', 'DESC']]
            });

            const data = {
                channels: rows,
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

    CHANGE_CHANNEL_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { status } = req.body;

            const channel = await MerchantChannel.findOne({ where: { id: req.params.id } });
            if (!channel) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道不存在', {});
            }

            await channel.update({ status: status });

            // Log
            await this.adminLogger(req, 'MerchantChannel', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHANNEL_CREATE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { merchant_id, payment_method, merchant_channel, channel_name, min_amount, max_amount } = req.body;
            await MerchantChannel.create({
                deposit_merchant_id: merchant_id,
                payment_method: payment_method,
                merchant_channel: merchant_channel,
                channel_name: channel_name,
                min_amount: min_amount,
                max_amount: max_amount,
                status: 1
            });

            // Log
            await this.adminLogger(req, 'MerchantChannel', 'create');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '创建成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHANNEL_UPDATE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const id = req.params.id;
            const { payment_method, merchant_channel, channel_name, min_amount, max_amount } = req.body;

            const merchantChannel = await MerchantChannel.findOne({ where: { id: id } });
            if (!merchantChannel) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道不存在', {});
            }
            await merchantChannel.update(
                {
                    payment_method: payment_method,
                    merchant_channel: merchant_channel,
                    channel_name: channel_name,
                    min_amount: min_amount,
                    max_amount: max_amount,
                },
            );

            // Log
            await this.adminLogger(req, 'MerchantChannel', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHANNEL_SORT = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const id = req.params.id;
            const { sort } = req.body;

            const merchantChannel = await MerchantChannel.findOne({ where: { id: id } });
            if (!merchantChannel) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道不存在', {});
            }

            await merchantChannel.update({ sort: sort });

            // Log
            await this.adminLogger(req, 'MerchantChannel', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '排序更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;