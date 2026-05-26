const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { WithdrawMerchant, Withdraw, WithdrawMerchantChannel } = require('../../models');
const { Op } = require('sequelize');
const { errLogger } = require('../../helpers/Logger');

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

            const merchants = await WithdrawMerchant.findAll({
                where: condition,
                attributes: ['id', 'name', 'api', 'app_id', 'app_code', 'withdraw_count', 'remain_count', 'status', 'createdAt', 'updatedAt'],
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
            const merchant = await WithdrawMerchant.findOne({ where: { id: id } });
            if (!merchant) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '商户不存在', {});
            }

            await merchant.update({ status: status });

            await WithdrawMerchantChannel.update(
                { status: status },
                { where: { withdraw_merchant_id: id } }
            );

            await this.redisHelper.deleteKey(`all_withdraw_merchants`);

            // Log
            await this.adminLogger(req, 'WithdrawMerchant', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    WITHDRAW_METHOD = async (req, res) => {
        try {
            const withdrawMethods = await this.redisHelper.getValue('withdraw_methods');
            if (withdrawMethods) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, JSON.parse(withdrawMethods));
            }
            
            const methods = [
                { id: 1, name: '银行卡' },
            ]
            await this.redisHelper.setValue('withdraw_methods', JSON.stringify(methods));

            return MyResponse(res, this.ResCode.SUCCESS.code, true, this.ResCode.SUCCESS.msg, methods);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    CHANNEL_LIST = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const merchantId = req.query.merchantId;
            const withdrawMethod = req.query.withdrawMethod;

            let condition = {};
            if (merchantId) {
                condition.withdraw_merchant_id = merchantId;
            }
            if (withdrawMethod) {
                condition.withdraw_method = withdrawMethod;
            }

            const { count, rows } = await WithdrawMerchantChannel.findAndCountAll({
                where: condition,
                include: {
                    model: WithdrawMerchant,
                    as: 'withdraw_merchant',
                    attributes: ['id', 'name']
                },
                attributes: ['id', 'withdraw_merchant_id', 'withdraw_method', 'merchant_channel', 'channel_name', 'min_amount', 'max_amount', 'status', 'withdraw_count', 'remain_count', 'createdAt', 'updatedAt'],
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

            const channel = await WithdrawMerchantChannel.findOne({ where: { id: req.params.id } });
            if (!channel) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道不存在', {});
            }

            await channel.update({ status: status });

            await this.redisHelper.deleteKey(`all_withdraw_merchants`);

            // Log
            await this.adminLogger(req, 'WithdrawMerchantChannel', 'update');

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

            const { merchant_id, withdraw_method, merchant_channel, channel_name, min_amount, max_amount, withdraw_count, remain_count } = req.body;
            await WithdrawMerchantChannel.create({
                withdraw_merchant_id: merchant_id,
                withdraw_method: withdraw_method,
                merchant_channel: merchant_channel,
                channel_name: channel_name,
                min_amount: min_amount,
                max_amount: max_amount,
                withdraw_count: withdraw_count ?? 0,
                remain_count: remain_count ?? 0,
                status: 1
            });

            // Log
            await this.adminLogger(req, 'WithdrawMerchantChannel', 'create');
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
            const { withdraw_method, merchant_channel, channel_name, min_amount, max_amount, withdraw_count, remain_count } = req.body;

            const merchantChannel = await WithdrawMerchantChannel.findOne({ where: { id: id } });
            if (!merchantChannel) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道不存在', {});
            }
            await merchantChannel.update(
                {
                    withdraw_method: withdraw_method,
                    merchant_channel: merchant_channel,
                    channel_name: channel_name,
                    min_amount: min_amount,
                    max_amount: max_amount,
                    withdraw_count: withdraw_count ?? 0,
                    remain_count: remain_count ?? 0
                },
            );

            // Log
            await this.adminLogger(req, 'WithdrawMerchantChannel', 'update');

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

            const merchantChannel = await WithdrawMerchantChannel.findOne({ where: { id: id } });
            if (!merchantChannel) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道不存在', {});
            }

            await merchantChannel.update({ sort: sort });

            // Log
            await this.adminLogger(req, 'WithdrawMerchantChannel', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '排序更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    SEND_WITHDRAW_TO_THIRD_PARTY = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { sendCount, withdrawDate } = req.body;

            const id = req.params.id;
            const channel = await WithdrawMerchantChannel.findOne({ 
                include: {
                    model: WithdrawMerchant,
                    as: 'withdraw_merchant',
                    attributes: ['id', 'xpay360']
                },
                where: { id: id } 
            });
            if (!channel) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道不存在', {});
            }
            if (channel.status !== 1) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, '通道未启用', {});
            }
            if (channel.withdraw_count > 0 && sendCount > channel.remain_count) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, `发送数量不能超过剩余可发送数量${channel.remain_count}`, {});
            }
            const method = channel.withdraw_method === 1 ? 'BANK' : 'ALIPAY';
            const withdraws = await Withdraw.findAll({
                where: {
                    type: method,
                    status: 0,
                    is_requested_third_party: 0,
                    createdAt: {
                        [Op.lte]: withdrawDate ? new Date(withdrawDate) : new Date()
                    }
                },
                attributes: ['id'],
                order: [['createdAt', 'DESC']],
                limit: sendCount ? parseInt(sendCount) : 1000
            });
            
            const withdrawIds = withdraws.map(w => w.id);
            if (withdrawIds.length === 0) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '没有可发送的提现订单', {});
            }

            // Channels
            const processingKey = `withdraw_channel_processes`;
            const processingChannels = await this.redisHelper.getValue(processingKey);
            let processingChannelIds = [];
            if (processingChannels) {
                processingChannelIds = JSON.parse(processingChannels);
            }
            if (!processingChannelIds.includes(channel.id)) {
                processingChannelIds.push(channel.id);
                await this.redisHelper.setValue(processingKey, JSON.stringify(processingChannelIds));
            }

            // Set withdraws to redis list for processing
            const redisKey = `withdraw_channel_${channel.id}_queue`;
            await this.redisHelper.setValue(redisKey, JSON.stringify(withdrawIds));

            await Withdraw.update(
                { is_requested_third_party: 1, withdraw_merchant_id: channel.withdraw_merchant_id },
                { 
                    where: {
                        type: method,
                        status: 0,
                        is_requested_third_party: 0
                    },
                }
            );

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '提现订单已发送到处理队列', { sentCount: withdrawIds.length });
        } catch (error) {
            console.log(error);
            errLogger.error(`Error in SEND_WITHDRAW_TO_THIRD_PARTY: ${error.message}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;