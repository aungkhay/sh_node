const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const ResdisHelper = require('../../helpers/RedisHelper');
const { errLogger, commonLogger } = require('../../helpers/Logger');
let { validationResult } = require('express-validator');
const { UserKYC, User, db, PaymentMethod, Rank, UserBonus, Config } = require('../../models');
const multer = require('multer');
const path = require('path');
const AliOSS = require('../../helpers/AliOSS');
const { Sequelize, Op } = require('sequelize');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const qs = require('qs');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new ResdisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
        this.OSS = new AliOSS();
        this.getOffset = this.commonHelper.getOffset;
        this.TIANYUAN_ACCESS_ID = process.env.TIANYUAN_ACCESS_ID;
        this.TIANYUAN_ACCESS_KEY = process.env.TIANYUAN_ACCESS_KEY;
        this.WANYI_ACCESS_ID = process.env.WANYI_ACCESS_ID;
        this.WANYI_ACCESS_KEY = process.env.WANYI_ACCESS_KEY;
        this.WANYI_BUSINESS_ID = process.env.WANYI_BUSINESS_ID;
    }

    encryptCBC = (plaintext, hexKey) => {
        const key = CryptoJS.enc.Hex.parse(hexKey);   // 16 bytes
        const iv = CryptoJS.lib.WordArray.random(16); // random IV

        const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        // IV + ciphertext
        const result = iv.concat(encrypted.ciphertext);

        return CryptoJS.enc.Base64.stringify(result);
    }

    decryptCBC = (base64Data, hexKey) => {
        const key = CryptoJS.enc.Hex.parse(hexKey);
        const data = CryptoJS.enc.Base64.parse(base64Data);

        // extract IV & ciphertext
        const iv = CryptoJS.lib.WordArray.create(data.words.slice(0, 4), 16);
        const ciphertext = CryptoJS.lib.WordArray.create(
            data.words.slice(4),
            data.sigBytes - 16
        );

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext },
            key,
            {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
            }
        );

        return CryptoJS.enc.Utf8.stringify(decrypted);
    }

    CHECK_KYC_TIANYUAN = async (userId, nrc_name, nrc_number) => {
        try {
            const timestamp = Math.floor(Date.now()); // 13 digits
            const url = `https://api.tianyuanapi.com/api/v1/IVYZ2A8B?t=${timestamp}`;
            const data = JSON.stringify({
                id_card: nrc_number,
                name: nrc_name,
                authorized: "1"
            });
            const encryptedData = this.encryptCBC(data, this.TIANYUAN_ACCESS_KEY);
            const response = await axios.post(url, { data: encryptedData }, { headers: { 'Access-Id': this.TIANYUAN_ACCESS_ID } });
            // Log
            commonLogger(`[TianYuan][UserID: ${userId}] Request: ${data} | Response: ${JSON.stringify(response.data)}`);
            if (response.data && response.data.code === 0) {
                return true;
            }
            return false;
        } catch (error) {
            errLogger(`[TianYuan][UserID: ${userId}] ${nrc_name} | ${nrc_number} | ${error.stack}`);
            return false;
        }
    }

    noncer = () => {
        var range = function (start, end) {
            var array = [];
            for (var i = start; i < end; ++i) {
                array.push(i);
            }
            return array;
        };
        var nonce = range(0, 6).map(function (x) {
            return Math.floor(Math.random() * 10);
        }).join('');
        return nonce;
    }

    genSignature = (secretKey, paramsJson) => {
        var sorter = function (paramsJson) {
            var sortedJson = {};
            var sortedKeys = Object.keys(paramsJson).sort();
            for (var i = 0; i < sortedKeys.length; i++) {
                sortedJson[sortedKeys[i]] = paramsJson[sortedKeys[i]]
            }
            return sortedJson;
        }
        var sortedParam = sorter(paramsJson);
        var needSignatureStr = "";
        for (var key in sortedParam) {
            var value = sortedParam[key];
            needSignatureStr = needSignatureStr + key + value;
        }
        needSignatureStr += secretKey;
        var signatureMethod = paramsJson.signatureMethod;
        if (signatureMethod == undefined || signatureMethod == null) {
            signatureMethod = "md5";
        }
        signatureMethod = signatureMethod.toLowerCase();
        switch (signatureMethod) {
            case "md5":
            case "sha1":
            case "sha256":
                return crypto.createHash(signatureMethod).update(needSignatureStr, "utf-8").digest("hex");
            case "sm3":
                return sm3(needSignatureStr);
            default:
                console.log("[ERROR] 签名方法不支持");
                return null;
        }
    };

    CHECK_KYC = async (userId, nrc_name, nrc_number) => {
        try {
            const url = `http://verify.dun.163.com/v1/idcard/check`;
            var params = {
                // 1.设置公有有参数
                secretId: this.WANYI_ACCESS_ID,
                businessId: this.WANYI_BUSINESS_ID,
                version: "v1",
                timestamp: new Date().getTime(),
                nonce: this.noncer(),
                signatureMethod: "MD5",
                // 2.设置私有参数
                name: nrc_name,
                cardNo: nrc_number
            };
            var signature = this.genSignature(this.WANYI_ACCESS_KEY, params);
            params.signature = signature;
            const res = await axios.post(url,qs.stringify(params),{
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 30000
            });

            if (res.data && res.data.code === 200 && res.data.result && res.data.result.status === 1) {
                return true;
            }

            return false;
        } catch (error) {
            errLogger(`[CHECK_KYC]: ${error.stack}`);
            return false;
        }
    }

    VERIFY_KYC = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const userId = req.user_id;
            const { nrc_name, nrc_number, nrc_front_pic, nrc_back_pic, nrc_hold_pic } = req.body;

            const kycExist = await UserKYC.findOne({ 
                where: { 
                    nrc_number: nrc_number
                }, 
                attributes: ['id'] 
            });
            if (kycExist) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '该身份证号码已被使用', {});
            }

            const isNrcValid = await this.CHECK_KYC(userId, nrc_name, nrc_number);
            if (!isNrcValid) {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '身份证号码和姓名不匹配', {}); 
            }

            const dob = this.commonHelper.getDOB(nrc_number);
            const t = await db.transaction();
            try {

                const user = await User.findByPk(userId, {
                    include: {
                        model: UserKYC,
                        as: 'kyc',
                        attributes: ['status']
                    },
                    attributes: ['id', 'relation'],
                    transaction: t,
                });
                if (user.kyc) {
                    if (user.kyc.status === 'PENDING') {
                        throw new Error('实名认证审核中');
                    }
                    if (user.kyc.status === 'APPROVED') {
                        throw new Error('实名认证已通过');
                    }
                }

                const autoApprove = false; // 是否自动通过实名认证
                const obj = {
                    user_id: userId,
                    relation: user.relation,
                    nrc_name: nrc_name,
                    nrc_number: nrc_number,
                    dob: dob,
                    nrc_front_pic: nrc_front_pic,
                    nrc_back_pic: nrc_back_pic,
                    nrc_hold_pic: nrc_hold_pic,
                    status: autoApprove ? 'APPROVED' : 'PENDING'
                };

                let kyc = await UserKYC.findOne({ where: { user_id: userId }, attributes: ['id'], transaction: t });
                if (!kyc) {
                    kyc = await UserKYC.create(obj, { transaction: t })
                } else {
                    await kyc.update(obj, { transaction: t });
                }

                if (autoApprove) {
                    await user.update({ name: nrc_name }, { transaction: t });

                    // Referral bonus settings [推荐金]
                    let lv1_bonus = await this.redisHelper.get_referral_bonus_lv(1); // 10
                    let lv2_bonus = await this.redisHelper.get_referral_bonus_lv(2); // 5
                    let lv3_bonus = await this.redisHelper.get_referral_bonus_lv(3); // 1
                    const bonusArr = [lv1_bonus, lv2_bonus, lv3_bonus];
                    commonLogger(`[VERIFY_KYC] Referral Bonus Settings: LV1=${lv1_bonus}, LV2=${lv2_bonus}, LV3=${lv3_bonus}`);

                    const relationArr = user.relation.split('/');
                    const upLevelIds = (relationArr.slice(1, relationArr.length - 1)).reverse().slice(0, 3); // remove first & last empty string (limit to 3 levels)
                    const bonuses = [];
                    commonLogger(`[VERIFY_KYC] Uplines: ${upLevelIds.join(',')}`);

                    const upLevelUsers = await User.findAll({
                        where: {
                            id: { [Op.in]: upLevelIds }
                        },
                        attributes: ['id', 'relation', 'type'],
                        transaction: t,
                    });

                    for (let index = 0; index < upLevelIds.length; index++) {
                        const bonus = Number(bonusArr[index]);
                        if (bonus <= 0) {
                            continue;
                        }
                        const upLevelUser = upLevelUsers.find(u => u.id == upLevelIds[index]);
                        if (!upLevelUser || upLevelUser.type !== 2) { // only User type can get bonus
                            continue;
                        }
                        commonLogger(`[VERIFY_KYC] Granting bonus ${bonus} to UserID: ${upLevelUser.id}`);
                        await upLevelUser.increment({ referral_bonus: bonus }, { transaction: t });
                        bonuses.push({
                            relation: upLevelUser.relation,
                            user_id: upLevelUser.id,
                            from_user_id: user.id,
                            amount: bonus
                        });
                    }
                    if (bonuses.length > 0) {
                        await UserBonus.bulkCreate(bonuses, { transaction: t });
                    }
                }

                // Update Rank Points to Uplines [经验值]
                // /1/2/7/10/12/13/14
                // const arr = user.relation.split("/").filter(v => v).slice(1, -1).map(Number); // [2,7,10,12,13]
                // const relArr = arr.reverse(); // [13,12,10,7,2]
                
                // const rankPoints = [];
                // const parents = await User.findAll({
                //     where: {
                //         id: { [Op.in]: relArr }
                //     },
                //     attributes: ['id']
                // });

                // // Points per level 
                // const levelAmounts = [10, 5, 1]; // First three levels
                // const defaultAmount = 0.5;       // Remaining levels

                // for (let i = 0; i < relArr.length; i++) {
                //     const parentId = relArr[i];
                //     const amount = levelAmounts[i] ?? defaultAmount; // Use default if beyond defined levels

                //     rankPoints.push({ type: 1, from: user.id, to: parentId, amount: amount, relation: user.relation });

                //     const parent = parents.find(p => p.id == parentId);
                //     if (parent) {
                //         await parent.increment({ rank_point: amount }, { transaction: t });
                //     }
                // }

                // // Bulk create all rank points at once
                // if (rankPoints.length > 0) {
                //     await UserRankPoint.bulkCreate(rankPoints, { transaction: t });
                // }
                
                await t.commit();
            } catch (error) {
                errLogger(`[VERIFY_KYC]: ${error.stack}`);
                await t.rollback();
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, error.message || this.ResCode.BAD_REQUEST.msg, {});
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '绑定实名认证成功', {});
        } catch (error) {
            errLogger(`[VERIFY_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_KYC_SIGN_URL = async (req, res) => {
        const lockKey = `lock:get_kyc_sign_url:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1, 5);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }

            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { filename, content_type } = req.body;
            const userId = req.user_id;
            const filePath = `/uploads/kyc/${userId}/${filename}`;
            const url = await this.OSS.SIGN_URL(filePath, content_type);
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { sign_url: url, file_url: filePath });
        } catch (error) {
            errLogger(`[KYC][GET_KYC_SIGN_URL]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {}); 
        }
    }

    UPLOAD_KYC = async (req, res) => {
        try {
            const type = req.params.type;
            if (!['front', 'back', 'hold'].includes(type)) {
                const recaptchaError = { field: 'type', msg: '类型不正确' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            }
            const userId = req.user_id;
            req.uploadDir = `./uploads/kyc/${userId}`;

            const userKYC = await UserKYC.findOne({
                where: { user_id: userId },
                attributes: ['id', 'status']
            })
            if (userKYC) {
                if (userKYC.status === 'PENDING') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '实名认证审核中', {});
                }
                if (userKYC.status === 'APPROVED') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '实名认证已通过', {});
                }
            }

            const upload = require('../../middlewares/UploadImage');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '20MB' });
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
                const dir = `uploads/kyc/${userId}/`;
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/kyc/${userId}/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: `/uploads/kyc/${userId}/${fileName}` });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[UPLOAD_KYC]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    KYC_INFO = async (req, res) => {
        try {
            const userId = req.user_id;
            const kyc = await UserKYC.findOne({
                where: { user_id: userId, status: 'APPROVED' },
                attributes: ['id', 'user_id', 'nrc_name', 'nrc_number', 'dob', 'nrc_front_pic', 'nrc_back_pic', 'nrc_hold_pic']
            })

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', kyc);
        } catch (error) {
            errLogger(`[KYC_INFO]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    BIND_PAYMENT_METHOD = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { bank_card_number, bank_card_name, bank_card_phone_number, open_bank_name, ali_account_name, ali_account_number, bank_card_pic, ali_qr_code_pic, ali_home_page_screenshot } = req.body;
            const userId = req.user_id;
            const user = await User.findByPk(userId, {
                include: {
                    model: PaymentMethod,
                    as: 'payment_method',
                    attributes: ['bank_status', 'alipay_status']
                },
                attributes: ['id', 'relation']
            });
            if (user.payment_method) {
                if (user.payment_method.bank_status === 'PENDING') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '银行审核中', {});
                }
                if (user.payment_method.bank_status == 'APPROVED') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '银行已通过', {});
                }
                if (user.payment_method.alipay_status === 'PENDING') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付宝审核中', {});
                }
                if (user.payment_method.alipay_status == 'APPROVED') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付宝已通过', {});
                }
            }
                
            const obj = {
                bank_card_number: bank_card_number,
                bank_card_name: bank_card_name,
                bank_card_phone_number: bank_card_phone_number,
                open_bank_name: open_bank_name,
                ali_account_name: ali_account_name,
                ali_account_number: ali_account_number,
                bank_card_pic: bank_card_pic,
                ali_qr_code_pic: ali_qr_code_pic,
                ali_home_page_screenshot: ali_home_page_screenshot,
                bank_status: 'APPROVED',
                alipay_status: 'APPROVED'
            }
            let method = await PaymentMethod.findOne({ where: { user_id: userId }, attributes: ['id'] });
            if (!method) {
                method = await PaymentMethod.create({
                    relation: user.relation,
                    user_id: userId,
                    ...obj
                });
            } else {
                await method.update(obj);
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '绑定支付成功', { id: method.id });
        } catch (error) {
            errLogger(`[BIND_PAYMENT_METHOD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    GET_PAYMENT_METHOD_SIGN_URL = async (req, res) => {
        const lockKey = `lock:get_payment_method_sign_url:${req.user_id}`;
        let redisLocked = false;

        try {
            /* ===============================
            * REDIS LOCK (ANTI FAST-CLICK)
            * =============================== */
            redisLocked = await this.redisHelper.setLock(lockKey, 1, 5);
            if (redisLocked !== 'OK') {
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '操作过快，请稍后再试', {});
            }
            
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { filename, content_type } = req.body;
            const userId = req.user_id;
            const filePath = `/uploads/payment-method/${userId}/${filename}`;
            const url = await this.OSS.SIGN_URL(filePath, content_type);
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', { sign_url: url, file_url: filePath });
        } catch (error) {
            errLogger(`[PAYMENT_METHOD][GET_PAYMENT_METHOD_SIGN_URL]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {}); 
        }
    }

    UPLOAD_PAYMENT_METHOD = async (req, res) => {
        try {
            const type = req.params.type;
            if (!['bank_card_pic', 'ali_qr_code_pic', 'ali_home_page_screenshot'].includes(type)) {
                const recaptchaError = { field: 'type', msg: '类型不正确' };
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, [recaptchaError]);
            }
            const userId = req.user_id;
            req.uploadDir = `./uploads/payment-method/${userId}`;

            const method = await PaymentMethod.findOne({
                where: { user_id: userId },
                attributes: ['id', 'bank_card_pic', 'ali_qr_code_pic', 'ali_home_page_screenshot', 'bank_status', 'alipay_status']
            })
            if (method) {
                if (type == 'bank_card_pic') {
                    if (method.bank_status === 'PENDING') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '银行审核中', {});
                    }
                    if (method.bank_status === 'APPROVED') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '银行已通过', {});
                    }
                }
                if (type == 'ali_qr_code_pic' || type == 'ali_home_page_screenshot') {
                    if (method.alipay_status === 'PENDING') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付宝审核中', {});
                    }
                    if (method.alipay_status === 'APPROVED') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付宝已通过', {});
                    }
                }
            }

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

                // Upload to AliOSS
                const dir = `uploads/payment-method/${userId}/`;
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/payment-method/${userId}/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', { url: `/uploads/payment-method/${userId}/${fileName}` });
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[UPLOAD_PAYMENT_METHOD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    BIND_BANK = async (req, res) => {
        try {
            const err = validationResult(req);  
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { bank_card_number, bank_card_name, bank_card_phone_number, open_bank_name, bank_card_pic } = req.body;
            const userId = req.user_id;
            const user = await User.findByPk(userId, {
                include: {
                    model: PaymentMethod,
                    as: 'payment_method',
                    attributes: ['bank_status']
                },
                attributes: ['id', 'relation']
            });
            if (user.payment_method) {
                if (user.payment_method.bank_status === 'PENDING') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '银行审核中', {});
                }
                if (user.payment_method.bank_status == 'APPROVED') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '银行已通过', {});
                }
            }
                
            const obj = {
                bank_card_number: bank_card_number,
                bank_card_name: bank_card_name,
                bank_card_phone_number: bank_card_phone_number,
                open_bank_name: open_bank_name,
                bank_card_pic: bank_card_pic,
                bank_status: 'APPROVED'
            }

            let method = await PaymentMethod.findOne({ where: { user_id: userId }, attributes: ['id'] });
            if (!method) {
                method = await PaymentMethod.create({
                    relation: user.relation,
                    user_id: userId,
                    ...obj
                });
            } else {
                await method.update(obj);
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '绑定银行成功', {});

        } catch (error) {
            errLogger(`[BIND_BANK]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    BIND_ALIPAY = async (req, res) => {
        try {
            const err = validationResult(req);      
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { ali_account_name, ali_account_number, ali_qr_code_pic, ali_home_page_screenshot } = req.body;
            const userId = req.user_id;
            const user = await User.findByPk(userId, {
                include: {
                    model: PaymentMethod,
                    as: 'payment_method',
                    attributes: ['alipay_status']
                },
                attributes: ['id', 'relation']
            });
            if (user.payment_method) {
                if (user.payment_method.alipay_status === 'PENDING') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付宝审核中', {});
                }
                if (user.payment_method.alipay_status == 'APPROVED') {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '支付宝已通过', {});
                }
            }
            const obj = {
                ali_account_name: ali_account_name,
                ali_account_number: ali_account_number,
                ali_qr_code_pic: ali_qr_code_pic,
                ali_home_page_screenshot: ali_home_page_screenshot,
                alipay_status: 'APPROVED'
            }   
            let method = await PaymentMethod.findOne({ where: { user_id: userId }, attributes: ['id'] });
            if (!method) {
                method = await PaymentMethod.create({
                    relation: user.relation,
                    user_id: userId,
                    ...obj
                });
            } else {
                await method.update(obj);
            }
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '绑定支付宝成功', {});
        } catch (error) {
            errLogger(`[BIND_ALI_PAY]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    PAYMENT_METHOD_INFO = async (req, res) => {
        try {
            const userId = req.user_id;
            const method = await PaymentMethod.findOne({
                where: { user_id: userId },
                attributes: [
                    'id',
                    'user_id',
                    'bank_card_number',
                    'bank_card_name',
                    'bank_card_phone_number',
                    'open_bank_name',
                    'bank_card_pic',
                    'bank_status',
                    'ali_account_name',
                    'ali_account_number',
                    'ali_qr_code_pic',
                    'ali_home_page_screenshot',
                    'alipay_status',
                ]
            });

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', method);
        } catch (error) {
            errLogger(`[KYC_INFO]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    BIND_ADDRESS = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }

            const { address } = req.body;
            const userId = req.user_id;

            await User.update({ address: address, address_status: 'PENDING' }, { where: { id: userId } });

            return MyResponse(res, this.ResCode.SUCCESS.code, false, '绑定地址成功', {});
        } catch (error) {
            errLogger(`[UPDATE_ADDRESS]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD_PROFILE_PICTURE = async (req, res) => {
        try {
            const userId = req.user_id;
            req.uploadDir = `./uploads/profiles`;

            const user = await User.findByPk(userId, { attributes: ['id', 'profile_picture'] });
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

                // Upload to AliOSS
                const dir = `uploads/profiles/`;
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/profiles/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await user.update({ profile_picture: `/uploads/profiles/${fileName}` });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传头像成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[UPLOAD_PROFILE_PICTURE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TEAM_OLD = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const level = parseInt(req.query.level || 0); // 0 => all
            const userId = req.user_id;

            const removeBeforeAndValue = arr => {
                const index = arr.indexOf(String(userId));
                return index >= 0 ? arr.slice(index + 1) : [];
            };

            let data = {
                users: [],
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: 0,
                    total: 0
                }
            }
            
            let userIds = [];
            const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
            if(level > 0) {
                const users = await User.findAll({
                    where: {
                        relation: { [Op.like]: `${me.relation}/%` }
                    },
                    attributes: ['id', 'relation']
                });
                
                for (let i = 0; i < users.length; i++) {
                    const u = users[i];
                    const relation = u.relation.split('/');
                    if(relation.length > 0) {
                        const newRel = relation.slice(1);
                        const arr = removeBeforeAndValue(newRel);
                        if(arr.length == level) {
                            userIds.push(u.id);
                        }
                    }
                }
            }

            let conditions = {
                relation: { [Op.like]: `${me.relation}/%` }
            }
            
            if(level > 0 && userIds.length == 0) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
            } else if(userIds.length > 0) {
                conditions.id = {
                    [Op.in]: userIds
                }
            }

            const { rows, count } = await User.findAndCountAll({
                include: {
                    model: Rank,
                    as: 'rank',
                    attributes: ['name']
                },
                where: conditions,
                attributes: [
                    'id', 'name',
                    [
                        Sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM users AS tc
                            WHERE tc.parent_id = User.id
                            AND tc.deletedAt IS NULL
                        )`),
                        'team_count'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM users AS ttc
                            WHERE ttc.relation LIKE CONCAT('%/', User.id, '%')
                            AND ttc.id <> User.id
                            AND ttc.deletedAt IS NULL
                        )`),
                        'total_team_count'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM deposits AS pd
                            WHERE pd.user_id = User.id
                            AND pd.status = 1
                            AND pd.deletedAt IS NULL
                        )`),
                        'personal_deposit'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM withdraws AS pw
                            WHERE pw.user_id = User.id
                            AND pw.status = 1
                            AND pw.deletedAt IS NULL
                        )`),
                        'personal_withdraw'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM deposits AS gd
                            WHERE gd.relation LIKE CONCAT('%/', User.id, '%')
                            AND gd.status = 1
                            AND gd.deletedAt IS NULL
                        )`),
                        'group_deposit'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM withdraws AS gw
                            WHERE gw.relation LIKE CONCAT('%/', User.id, '%')
                            AND gw.status = 1
                            AND gw.deletedAt IS NULL
                        )`),
                        'group_withdraw'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(gold_count), 0)
                            FROM user_gold_prices AS pp
                            WHERE pp.user_id = User.id
                        )`),
                        'personal_gold_count'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(gold_count), 0)
                            FROM user_gold_prices AS gp
                            WHERE gp.relation LIKE CONCAT('%/', User.id, '%')
                        )`),
                        'group_gold_count'
                    ],
                ],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset,
            });

            data = {
                users: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[TEAM]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    TEAM = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);
            const level = parseInt(req.query.level || 0); // 0 => all
            const userId = req.user_id;

            const removeBeforeAndValue = arr => {
                const index = arr.indexOf(String(userId));
                return index >= 0 ? arr.slice(index + 1) : [];
            };

            let data = {
                users: [],
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: 0,
                    total: 0
                }
            }
            
            let userIds = [];
            const me = await User.findByPk(userId, { attributes: ['id', 'relation'] });
            if(level > 0) {
                const users = await User.findAll({
                    where: {
                        relation: { [Op.like]: `${me.relation}/%` }
                    },
                    attributes: ['id', 'relation']
                });
                
                for (let i = 0; i < users.length; i++) {
                    const u = users[i];
                    const relation = u.relation.split('/');
                    if(relation.length > 0) {
                        const newRel = relation.slice(1);
                        const arr = removeBeforeAndValue(newRel);
                        if(arr.length == level) {
                            userIds.push(u.id);
                        }
                    }
                }
            }

            let conditions = {
                relation: { [Op.like]: `${me.relation}/%` }
            }
            
            if(level > 0 && userIds.length == 0) {
                return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
            } else if(userIds.length > 0) {
                conditions.id = {
                    [Op.in]: userIds
                }
            }

            const total = await User.count({ where: conditions });
            const rows = await User.findAll({
                include: {
                    model: Rank,
                    as: 'rank',
                    attributes: ['name']
                },
                where: conditions,
                attributes: [
                    'id', 'name',
                    [
                        Sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM users AS tc
                            WHERE tc.parent_id = User.id
                            AND tc.deletedAt IS NULL
                        )`),
                        'team_count'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM users AS ttc
                            WHERE ttc.relation LIKE CONCAT('%/', User.id, '%')
                            AND ttc.id <> User.id
                            AND ttc.deletedAt IS NULL
                        )`),
                        'total_team_count'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM deposits AS pd
                            WHERE pd.user_id = User.id
                            AND pd.status = 1
                            AND pd.deletedAt IS NULL
                        )`),
                        'personal_deposit'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM withdraws AS pw
                            WHERE pw.user_id = User.id
                            AND pw.status = 1
                            AND pw.deletedAt IS NULL
                        )`),
                        'personal_withdraw'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM deposits AS gd
                            WHERE gd.relation LIKE CONCAT('%/', User.id, '%')
                            AND gd.status = 1
                            AND gd.deletedAt IS NULL
                        )`),
                        'group_deposit'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(amount), 0)
                            FROM withdraws AS gw
                            WHERE gw.relation LIKE CONCAT('%/', User.id, '%')
                            AND gw.status = 1
                            AND gw.deletedAt IS NULL
                        )`),
                        'group_withdraw'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(gold_count), 0)
                            FROM user_gold_prices AS pp
                            WHERE pp.user_id = User.id
                        )`),
                        'personal_gold_count'
                    ],
                    [
                        Sequelize.literal(`(
                            SELECT COALESCE(SUM(gold_count), 0)
                            FROM user_gold_prices AS gp
                            WHERE gp.relation LIKE CONCAT('%/', User.id, '%')
                        )`),
                        'group_gold_count'
                    ],
                ],
                order: [['id', 'DESC']],
                limit: perPage,
                offset: offset,
            });

            data = {
                users: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    total: total,
                    totalPage: Math.ceil(total / perPage)
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            errLogger(`[TEAM]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;