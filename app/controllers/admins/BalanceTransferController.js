const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { BalanceTransfer, User } = require('../../models');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const from_phone = req.query.from_phone || null;
            const to_phone = req.query.to_phone || null;

            const from_user_filter = {}
            if (from_phone) {
                from_user_filter.phone_number = from_phone;
            }
            const to_user_filter = {}
            if (to_phone) {
                to_user_filter.phone_number = to_phone;
            }

            const { rows, count } = await BalanceTransfer.findAndCountAll({
                include: [
                    {
                        model: User,
                        as: 'from',
                        attributes: ['id', 'name', 'phone_number'],
                        where: from_user_filter
                    },
                    {
                        model: User,
                        as: 'to',
                        attributes: ['id', 'name', 'phone_number'],
                        where: to_user_filter
                    }
                ],
                attributes: ['id', 'relation', 'amount', 'before_from_amount', 'after_from_amount', 'before_to_amount', 'after_to_amount', 'createdAt'],
                order: [['createdAt', 'DESC']],
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
}

module.exports = Controller;