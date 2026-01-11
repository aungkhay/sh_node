const { check } = require('express-validator');

const passRegEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+={}[\]|\\:;"'<>,.?/~`]).{8,}$/;

exports.register = () => {
    return [
        check('phone', { msg: '手机号不能为空' }).not().isEmpty(),
        check('password')
            .not().isEmpty().withMessage('密码不能为空')
            .isLength({ min: 6 }).withMessage('密码至少需要6个字符')
            .custom(value => {
                if (/^(111111|123123|123456)$/.test(value)) {
                    throw new Error('密码太简单，请使用更复杂的密码');
                }
                return true;
            }),
        // check('password')
        //     .not().isEmpty().withMessage('密码不能为空')
        //     .isLength({ min: 8 }).withMessage('密码至少需要8个字符')
        //     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
        //     .withMessage('密码必须包含大写字母、小写字母、数字和特殊字符'),
        check('invite_code', { msg: '邀请码不能为空' }).not().isEmpty(),
        check('uuid', { msg: 'UUID_REQUIRED' }).not().isEmpty(),
        check('verification_code', { msg: '验证码不能为空' }).not().isEmpty()
    ];
}

exports.login = () => {
    return [
        check('phone', { msg: '手机号不能为空' }).not().isEmpty(),
        check('password', { msg: '密码不能为空' }).not().isEmpty(),
        check('uuid', { msg: 'UUID_REQUIRED' }).not().isEmpty(),
        check('verification_code', { msg: '验证码不能为空' }).not().isEmpty()
    ]
}

exports.verify_kyc = () => {
    return [
        check('nrc_name', { msg: '姓名不能为空' }).not().isEmpty(),
        check('nrc_number').not().isEmpty().withMessage('身份证号不能为空')
            .isLength({ min: 18, max: 18 }).withMessage('身份证号必须为18位')
            .custom(value => {
                const city = {
                    11: '北京', 12: '天津', 13: '河北', 14: '山西', 15: '内蒙古',
                    21: '辽宁', 22: '吉林', 23: '黑龙江', 31: '上海', 32: '江苏',
                    33: '浙江', 34: '安徽', 35: '福建', 36: '江西', 37: '山东',
                    41: '河南', 42: '湖北', 43: '湖南', 44: '广东', 45: '广西',
                    46: '海南', 50: '重庆', 51: '四川', 52: '贵州', 53: '云南',
                    54: '西藏', 61: '陕西', 62: '甘肃', 63: '青海', 64: '宁夏',
                    65: '新疆', 71: '台湾', 81: '香港', 82: '澳门', 91: '国外'
                };
                // 身份证格式（18位）
                const idCardReg = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i;
                if (!idCardReg.test(value)) {
                    throw new Error('身份证号格式错误');
                }
                // 地区码
                if (!city[value.substring(0, 2)]) {
                    throw new Error('身份证号格式错误');
                }
                // 校验位
                const factor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
                const parity = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
                
                const chars = value.toUpperCase().split('');
                let sum = 0;
                for (let i = 0; i < 17; i++) {
                    sum += parseInt(chars[i], 10) * factor[i];
                }

                const last = parity[sum % 11];

                if (last !== chars[17]) {
                    throw new Error('身份证号格式错误');
                }

                return true;
            }),
        // check('dob')
        //     .not().isEmpty().withMessage('出生日期不能为空')
        //     .isISO8601().withMessage('出生日期格式错误')
        //     .custom(value => {
        //         // Must match strictly YYYY-MM-DD
        //         if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        //             throw new Error('出生日期只能包含日期，不允许时间');
        //         }
        //         return true;
        //     }),
        check('nrc_front_pic', { msg: '请上传身份证正面照片' }).not().isEmpty(),
        check('nrc_back_pic', { msg: '请上传身份证背面照片' }).not().isEmpty(),
        check('nrc_hold_pic', { msg: '请上传手持身份证照片' }).not().isEmpty(),
    ]
}

exports.get_kyc_sign_url = () => {
    return [
        check('filename', { msg: '文件名不能为空' }).not().isEmpty(),
        check('content_type', { msg: '内容类型不能为空' }).not().isEmpty(),
    ]
}

exports.bind_payment_method = () => {
    return [
        check('bank_card_number', { msg: '银行卡号不能为空' }).not().isEmpty(),
        check('bank_card_name', { msg: '开户姓名不能为空' }).not().isEmpty(),
        check('bank_card_phone_number')
            .not().isEmpty().withMessage('预留手机号不能为空')
            .isLength({ min: 11, max: 11 }).withMessage('手机号必须为11位数字'),
        check('open_bank_name', { msg: '开户银行不能为空' }).not().isEmpty(),
        check('ali_account_name', { msg: '支付宝姓名不能为空' }).not().isEmpty(),
        check('ali_account_number', { msg: '支付宝账号不能为空' }).not().isEmpty(),
        check('bank_card_pic', { msg: '请上传银行卡照片' }).not().isEmpty(),
        check('ali_qr_code_pic', { msg: '请上传支付宝收款码截图' }).not().isEmpty(),
        check('ali_home_page_screenshot', { msg: '请上传支付宝首页截图' }).not().isEmpty(),
    ];
}

exports.bind_bank = () => {
    return [
        check('bank_card_number', { msg: '银行卡号不能为空' }).not().isEmpty(),
        check('bank_card_name', { msg: '开户姓名不能为空' }).not().isEmpty(),
        check('bank_card_phone_number')
            .not().isEmpty().withMessage('预留手机号不能为空')
            .isLength({ min: 11, max: 11 }).withMessage('手机号必须为11位数字'),
        check('open_bank_name', { msg: '开户银行不能为空' }).not().isEmpty(),
        check('bank_card_pic', { msg: '请上传银行卡照片' }).not().isEmpty(),
    ];
}

exports.bind_alipay = () => {
    return [
        check('ali_account_name', { msg: '支付宝姓名不能为空' }).not().isEmpty(),   
        check('ali_account_number', { msg: '支付宝账号不能为空' }).not().isEmpty(),
        check('ali_qr_code_pic', { msg: '请上传支付宝收款码截图' }).not().isEmpty(),
        check('ali_home_page_screenshot', { msg: '请上传支付宝首页截图' }).not().isEmpty(),
    ];
}

exports.bind_address = () => {
    // ^
    // ([\u4e00-\u9fa5]{1,10}省)?          # optional province (e.g., 广东省)
    // ([\u4e00-\u9fa5]{1,10}市)?          # optional city (e.g., 深圳市)
    // ([\u4e00-\u9fa5]{1,10}(区|县))?      # optional district/county (e.g., 南山区)
    // ([\u4e00-\u9fa5]{1,20}(街道|镇|乡|村))? # optional street/town/village (e.g., 科技园街道)
    // \s*
    // [\u4e00-\u9fa50-9\-号]*             # number or house info (e.g., 12号, A栋-3号)
    // $
    return [
        check('address').trim().not().isEmpty().withMessage('地址不能为空')
            .matches(/^([\u4e00-\u9fa5]{1,10}省)?([\u4e00-\u9fa5]{1,10}市)?([\u4e00-\u9fa5]{1,10}(区|县))?([\u4e00-\u9fa5]{1,20}(街道|镇|乡|村))?\s*[\u4e00-\u9fa5A-Za-z0-9\-号]*$/)
            .withMessage('地址格式不正确')
    ];
}

exports.modify_password = () => {
    return [
        check('phone', { msg: '手机号不能为空' }).not().isEmpty(),
        // check('old_password', { msg: '旧密码不能为空' }).not().isEmpty(),
        check('new_password')
            .not().isEmpty().withMessage('新密码不能为空')
            .isLength({ min: 6 }).withMessage('新密码至少需要6个字符')
            .custom(value => {
                if (/^(111111|123123|123456)$/.test(value)) {
                    throw new Error('新密码太简单，请使用更复杂的密码');
                }
                // 必须包含英文 或 符号
                if (!/[A-Za-z]/.test(value) && !/[^A-Za-z0-9]/.test(value)) {
                    throw new Error('新密码必须包含英文或符号');
                }
                return true;
            }),
        // check('new_password')
        //     .not().isEmpty().withMessage('新密码不能为空')
        //     .isLength({ min: 8 }).withMessage('密码长度至少为8个字符')
        //     .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
        //     .withMessage('密码必须包含大写字母、小写字母、数字和特殊字符'),
        check('nrc_last_six_digit', { msg: '身份证后六位不能为空' }).not().isEmpty(),
        // check('uuid', { msg: 'UUID_REQUIRED' }).not().isEmpty(),
        // check('verification_code', { msg: '验证码不能为空' }).not().isEmpty()
    ];
}

exports.forgot_password = () => {
    return [
        check('phone', { msg: '手机号不能为空' }).not().isEmpty(),
        check('nrc_number', { msg: '身份证号手机号不能为空' }).not().isEmpty(),
        check('new_password')
            .not().isEmpty().withMessage('新密码不能为空')
            .isLength({ min: 8 }).withMessage('密码长度至少为8个字符')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
            .withMessage('密码必须包含大写字母、小写字母、数字和特殊字符'),
        check('uuid', { msg: 'UUID_REQUIRED' }).not().isEmpty(),
        check('verification_code', { msg: '验证码不能为空' }).not().isEmpty()
    ];
}

exports.deposit = () => {
    return [
        check('type').not().isEmpty().withMessage('充值方式不能为空')
            .bail()
            .isNumeric()
            .withMessage('充值方式必须是数字')
            .bail()
            .isIn([1, 2, 3, 4]).withMessage('充值方式必须是 1 到 4 之间'),
        check('amount').not().isEmpty().withMessage('充值金额不能为空')
            .bail() // stop running validations if amount is empty
            .isNumeric()
            .withMessage('充值金额必须是数字')
    ]
}

exports.withdraw = () => {
    return [
        check('amount').not().isEmpty().withMessage('提现金额不能为空')
            .bail()
            .isNumeric()
            .withMessage('提现金额必须是数字')
            .bail()
            .custom((value) => Number(value) >= 100)
            .withMessage('最低提现金额为100'),
        check('withdrawBy').not().isEmpty().withMessage('提现方式不能为空')
            .bail()
            .isIn(['BANK', 'ALIPAY'])
            .withMessage('提现方式无效，只能是 BANK 或 ALIPAY')
    ]
}

exports.transfer = () => {
    return [
        check('amount').not().isEmpty().withMessage('转账金额不能为空')
            .bail()
            .isNumeric()
            .withMessage('转账金额必须是数字')
    ]
}

exports.impeach_child = () => {
    return [
        check('child_id').not().isEmpty().withMessage('子账号ID不能为空')
            .bail()
            .isNumeric()
            .withMessage('子账号ID必须是数字'),
        check('impeach_type').not().isEmpty().withMessage('类型不能为空')
            .bail()
            .isNumeric()
            .withMessage('类型必须是数字')
            .bail()
            .isIn([1, 2, 3])
            .withMessage('类型无效'),
        check('reason').not().isEmpty().withMessage('原因不能为空')
    ]
}

exports.inherit_owner = () => {
    return [
        check('inherit_account', { msg: '继承账号不能为空' }).not().isEmpty(),
        check('description', { msg: '描述不能为空' }).not().isEmpty(),
        check('prove_url', { msg: '请上传证明' }).not().isEmpty()
    ]
}

exports.buy_gold = () => {
    return [
        check('gold_count', { msg: '黄金数量不能为空' }).not().isEmpty()
            .bail()
            .isNumeric()
            .withMessage('黄金数量必须是数字'),
    ]
}

exports.post_news = () => {
    return [
        check('type').not().isEmpty().withMessage('类型不能为空')
            .bail()
            .isNumeric()
            .withMessage('类型必须是数字')
            .bail()
            .isIn([1, 2, 3])
            .withMessage('类型无效'),
        // check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('content', { msg: '内容不能为空' }).not().isEmpty(),
        check('file_url', { msg: '请上传图片' }).not().isEmpty(),
    ]
}

exports.report_news = () => {
    return [
        check('description', { msg: '举报内容不能为空' }).not().isEmpty(),
    ]
}

exports.redempt_code = () => {
    return [
        check('code', { msg: '兑换码不能为空' }).not().isEmpty(),
    ]
}