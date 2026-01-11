const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const RedisHelper = require('../../helpers/RedisHelper');
const { Config } = require('../../models');
const { errLogger } = require('../../helpers/Logger');

class Controller {
    constructor (app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new RedisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
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

    INDEX = async (req, res) => {
        try {
            const configs = await Config.findAll();

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', configs);
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

            const { title, val, description } = req.body;
            const config = await Config.findByPk(req.params.id);
            if(!config) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, this.ResCode.NOT_FOUND.msg, {});
            }

            if((config.data_type == 'integer' || config.data_type == 'double') && typeof val !== 'number') {
                const valError = [{ field: 'val', msg: '值必须是数字' }];
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, valError);
            }
            if((config.data_type == 'string' || config.data_type == 'html') && typeof val !== 'string') {
                const valError = [{ field: 'val', msg: '值必须是字符串' }];
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, valError);
            }
            if(config.data_type == 'array' && !Array.isArray(val)) {
                const valError = [{ field: 'val', msg: '值必须是数组' }];
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, valError);
            }
            if(config.type === 'deposit_time' || config.type === 'withdrawal_time_for_referral_bonus') {
                // format 12:00:00-17:00:00
                if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(val)) {
                    const valError = [{ field: 'val', msg: '值格式无效，正确格式如：12:00:00-17:00:00' }];
                    return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, valError);
                }
            }
            if (config.type === 'popup_announcement') {
                if (![0,1].includes(Number(description))) {
                    const descError = [{ field: 'description', msg: '描述字段值无效，必须是0或1' }];
                    return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, descError);
                }
                await this.redisHelper.setValue('is_show_popup', Number(description));
            }

            let newVal = val;
            if (Array.isArray(val) || typeof val === 'object') {
                newVal = JSON.stringify(val);
            }
            
            await config.update({ title, val: newVal, description });
            await this.redisHelper.setValue(config.type, config.val);
            await this.adminLogger(req, 'Config', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            errLogger(`[Config][UPDATE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller