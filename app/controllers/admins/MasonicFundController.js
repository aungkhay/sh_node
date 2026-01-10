const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { MasonicFundHistory, User, MasonicFund, TempMasonicFundHistory, RewardRecord } = require('../../models');
const { Op } = require('sequelize');
const XLSX = require("xlsx");
const multer = require('multer');
const { db } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.getOffset = this.commonHelper.getOffset;
        this.adminLogger = this.commonHelper.adminLogger;
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const phone = req.query.phone;
            const startTime = req.query.startTime;
            const endTime = req.query.endTime;
            const userId = req.user_id;

            let userCondition = {}
            if (phone) {
                userCondition.phone_number = phone;
            }

            let condition = {}
            if (userId != 1) {
                condition.relation = { [Op.like]: `%/${userId}/%` }
            }
            if (startTime && endTime) {
                condition.createdAt = {
                    [Op.between]: [startTime, endTime]
                }
            }

            const { rows, count } = await MasonicFundHistory.findAndCountAll({
                include: {
                    model: User,
                    as: 'user',
                    where: userCondition,
                    attributes: ['name', 'phone_number']
                },
                where: condition,
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                funds: rows,
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

    SUBSTRACT_MASONIC_FUND = async (req, res) => {
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
                console.log(excelData);
                const phoneNumbers = excelData
                    .map(r => String(r['手机号']).trim())
                    .filter(Boolean);

                if(phoneNumbers.length === 0) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件内容不能为空', {});
                }
                    
                const t = await db.transaction();
                try {
                    // Existing Numbers
                    const users = await User.findAll({
                        where: {
                            phone_number: { [Op.in]: phoneNumbers }
                        },
                        attributes: ['id', 'phone_number', 'relation', 'masonic_fund'],
                        transaction: t
                    });

                    let substractHistorys = [];
                    for(let user of users) {
                        const data = excelData.find(row => String(row['手机号']).trim() === user.phone_number);
                        if(!data) {
                            continue;
                        }
                        const amount = Number(data['金额']);
                        substractHistorys.push({
                            relation: user.relation,
                            user_id: user.id,
                            amount: amount,
                            description: data['类型'],
                            is_imported: 1,
                            status: 'APPROVED'
                        });
                        await user.increment({ masonic_fund: -amount }, { transaction: t });
                    }
                    await MasonicFundHistory.bulkCreate(substractHistorys, { transaction: t });

                    const existingNumbers = users.map(u => u.phone_number);
                    const notExistNumbers = phoneNumbers.filter(n => !existingNumbers.includes(n));
                    let notExistData = excelData.filter(row => {
                        const number = String(row['手机号']).trim();
                        return notExistNumbers.includes(number);
                    });
                    
                    // Check if phone numbers already exist in TempMasonicFundHistory
                    const existingTempRecords = await TempMasonicFundHistory.findAll({
                        where: {
                            phone_number: { [Op.in]: notExistNumbers }
                        },
                        attributes: ['phone_number'],
                        transaction: t
                    });
                    const existingTempNumbers = existingTempRecords.map(r => r.phone_number);
                    
                    // Filter out numbers that already exist in TempMasonicFundHistory
                    const newTempData = notExistData.filter(row => {
                        const number = String(row['手机号']).trim();
                        return !existingTempNumbers.includes(number);
                    });
                    
                    if(newTempData.length > 0) {
                        await TempMasonicFundHistory.bulkCreate(newTempData.map(row => ({
                            phone_number: String(row['手机号']).trim(),
                            amount: Number(row['金额']),
                            description: row['类型']
                        })), { transaction: t });
                    }

                    await t.commit();
                } catch (error) {
                    errLogger(`[SUBSTRACT_MASONIC_FUND]: ${error.stack}`);
                    await t.rollback();
                    return MyResponse(res, this.ResCode.DB_ERROR.code, true, error.message || '操作失败', {});
                }

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
            });
        } catch (error) {
            errLogger(`[SUBSTRACT_MASONIC_FUND]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TEMP_HISTORY = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            const { rows, count } = await TempMasonicFundHistory.findAndCountAll({
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset
            });
            const data = {
                temps: rows,
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

    UPDATE_FUND_STATUS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            
            const id = req.params.id;
            const { status } = req.body;
            const fundHistory = await MasonicFundHistory.findOne({
                where: {
                    id: id,
                    status: 'PENDING',
                    is_imported: 0
                },
                attributes: ['id', 'user_id', 'amount']
            })
            if (!fundHistory) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '记录不存在', {});
            }

            const t = await db.transaction();
            try {
                await fundHistory.update({ status: status }, { transaction: t  });
                if(status === 'APPROVED') {
                    const reward = await RewardRecord.findOne({
                        where: { user_id: fundHistory.user_id, reward_id: 6, is_used: 0 },
                        attributes: ['id', 'amount'],
                        transaction: t
                    });
                    const user = await User.findByPk(fundHistory.user_id, { attributes: ['id'], transaction: t });
                    await user.increment({ balance: fundHistory.amount, masonic_fund: -fundHistory.amount }, { transaction: t });
                    if (reward) {
                        await reward.update({ is_used: 1 }, { transaction: t });
                    }
                }
                await t.commit();

                // Log
                await this.adminLogger(req, 'MasonicFundHistory', 'update');

                return MyResponse(res, this.ResCode.SUCCESS.code, true, '更新成功', {});
            } catch (error) {
                errLogger(`[MasonicFundHistory][UPDATE]}]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.DB_ERROR.code, true, error.message || '操作失败', {});
            }
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller