const MyResponse = require('../../helpers/MyResponse');
let { validationResult } = require('express-validator');
const CommonHelper = require('../../helpers/CommonHelper');
const { DepositMerchant } = require('../../models');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
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
                attributes: ['id', 'name', 'api', 'app_id', 'app_code', 'status', 'min_amount', 'max_amount', 'allow_type', 'createdAt', 'updatedAt'],
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

            const { status } = req.body;

            await DepositMerchant.update(
                { status: status },
                { where: { id: req.params.id } }
            );

            // Log
            await this.adminLogger(req, 'DepositMerchant', 'update');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;