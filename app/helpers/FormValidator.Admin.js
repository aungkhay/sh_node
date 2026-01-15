const { check } = require('express-validator');

exports.login = () => {
    return [
        check('phone', { msg: '手机号不能为空' }).not().isEmpty(),
        check('password', { msg: '密码不能为空' }).not().isEmpty(),
        check('uuid', { msg: 'UUID_REQUIRED' }).not().isEmpty(),
        check('verification_code', { msg: '验证码不能为空' }).not().isEmpty()
    ]
}

exports.update_config = () => {
    return [
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('val', { msg: '值不能为空' }).not().isEmpty(),
        check('description', { msg: '描述不能为空' }).not().isEmpty(),
    ]
}

exports.create_certificate = () => {
    return [
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('pic', { msg: '请上传图片' }).not().isEmpty(),
    ]
}

exports.update_certificate = () => {
    return [
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
    ]
}

exports.update_status = () => {
    return [
        check('status')
            .not().isEmpty().withMessage('状态不能为空')
            .isInt({ min: 0, max: 1 }).withMessage('状态必须是0或1')
    ]
}

exports.update_impeach = () => {
    return [
        check('status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.create_info = () => {
    return [
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('content', { msg: '内容不能为空' }).not().isEmpty(),
        check('pic', { msg: '请上传他图片' }).not().isEmpty(),
    ]
}

exports.update_info = () => {
    return [
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('content', { msg: '内容不能为空' }).not().isEmpty(),
    ]
}

exports.update_inherit = () => {
    return [
        check('status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.get_oss_sign = () => {
    return [
        check('filename', { msg: '文件名不能为空' }).not().isEmpty(),
        check('content_type', { msg: '内容类型不能为空' }).not().isEmpty(),
    ]
}

exports.get_payment_method_oss_sign = () => {
    return [
        check('user_id', { msg: '用户ID不能为空' }).not().isEmpty(),
        check('filename', { msg: '文件名不能为空' }).not().isEmpty(),
        check('content_type', { msg: '内容类型不能为空' }).not().isEmpty()
    ]
}

exports.update_payment_method_pic_link = () => {
    return [
        check('pic_link', { msg: '图片链接不能为空' }).not().isEmpty(),
        check('user_id', { msg: '用户ID不能为空' }).not().isEmpty(),
        check('method_type', { msg: '付款方式类型不能为空' }).not().isEmpty()
            .bail()
            .isIn(['bank_card_pic', 'ali_qr_code_pic', 'ali_home_page_screenshot'])
            .withMessage('付款方式类型无效')
    ]
}

exports.create_news = () => {
    return [
        check('type').not().isEmpty().withMessage('类型不能为空')
            .bail()
            .isNumeric()
            .withMessage('类型必须是数字')
            .bail()
            .isIn([1, 2, 3])
            .withMessage('类型无效'),
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('content', { msg: '内容不能为空' }).not().isEmpty(),
        check('pic', { msg: '请上传图片' }).not().isEmpty(),
    ]
}

exports.update_news = () => {
    return [
        check('type').not().isEmpty().withMessage('类型不能为空')
            .bail()
            .isNumeric()
            .withMessage('类型必须是数字')
            .bail()
            .isIn([1, 2, 3])
            .withMessage('类型无效'),
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('content', { msg: '内容不能为空' }).not().isEmpty(),
    ]
}

exports.update_news_status = () => {
    return [
        check('status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.create_noti = () => {
    return [
        check('type').not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isNumeric()
            .withMessage('状态必须是数字')
            .bail()
            .isIn([1, 2, 3])
            .withMessage('状态无效'),
        check('title', { msg: '标题不能为空' }).not().isEmpty(),
        check('content', { msg: '内容不能为空' }).not().isEmpty(),
    ]
}

exports.update_rank = () => {
    return [
        check('name')
            .optional({ checkFalsy: true }),
        check('number_of_impeach').not().isEmpty().withMessage('弹劾次数不能为空')
            .bail()
            .isNumeric()
            .withMessage('弹劾次数必须是数字'),
        check('point').not().isEmpty().withMessage('积分不能为空')
            .bail()
            .isNumeric()
            .withMessage('积分必须是数字'),
        check('allowance').not().isEmpty().withMessage('津贴不能为空')
            .bail()
            .isNumeric()
            .withMessage('津贴必须是数字'),
        check('allowance_rate').not().isEmpty().withMessage('津贴比例不能为空')
            .bail()
            .isNumeric()
            .withMessage('津贴比例必须是数字'),
        check('salary_rate').not().isEmpty().withMessage('工资比例不能为空')
            .bail()
            .isNumeric()
            .withMessage('工资比例必须是数字'),
        check('welcome_message').not().isEmpty().withMessage('欢迎语不能为空')
    ]
}

exports.update_reward_type = () => {
    return [
        check('total_count')
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage('每日总数必须为数字'),
        check('remain_count')
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage('剩余每日总数必须为数字'),
        check('range_min').not().isEmpty().withMessage('最小范围不能为空')
            .bail()
            .isInt({ min: 1, max: 100 }).withMessage('最小范围无效'),
        check('range_max').not().isEmpty().withMessage('最大范围不能为空')
            .bail()
            .isInt({ min: 1, max: 100 }).withMessage('最大范围无效'),
        check('amount_min')
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage('最小金额必须为数字'),
        check('amount_max')
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage('最大金额必须为数字'),
    ]
}

exports.set_as_energy_forum = () => {
    return [
        check('is_energy_forum').not().isEmpty().withMessage('值不能为空')
            .bail()
            .isIn([0, 1])
            .withMessage('值无效')
    ]
}

exports.create_referral_reward_setting = () => {
    return [
        check('name', { msg: '名称不能为空' }).not().isEmpty(),
        check('amount').not().isEmpty().withMessage('金额不能为空')
            .bail()
            .isNumeric()
            .withMessage('金额必须是数字'),
        check('total_count').not().isEmpty().withMessage('总数不能为空')
            .bail()
            .isInt({ min: 1 }).withMessage('总数无效'),
    ]
}

exports.add_reward_record = () => {
    return [
        // user_id is optional
        check('user_id')
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage('用户ID必须是数字'),
        // is_all_user is optional
        check('is_all_user')
            .optional({ checkFalsy: true })
            .isIn([0, 1])
            .withMessage('是否所有用户值无效'),
        check('reward_id', { msg: '奖励类型ID不能为空' }).not().isEmpty()
            .bail()
            .isIn([1,2,3,4,6,7,8])
            .withMessage('奖励类型ID无效'),
        check('amount').not().isEmpty().withMessage('金额不能为空')
            .bail()
            .isNumeric()
            .withMessage('金额必须是数字'),
    ]
}

exports.delete_multiple_rewards = () => {
    return [
        check('ids').not().isEmpty().withMessage('奖励记录ID不能为空')
            .bail()
            .isArray({ min: 1 }).withMessage('奖励记录ID无效'),
    ]
}

exports.update_ticket = () => {
    return [
        check('price').not().isEmpty().withMessage('价格不能为空')
            .bail()
            .isNumeric()
            .withMessage('价格必须是数字'),
    ]
}

exports.update_kyc_status = () => {
    return [
        check('status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.update_masonic_fund_status = () => {
    return [
        check('status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.approved_multiple_kyc = () => {
    return [
        check('ids').not().isEmpty().withMessage('用户ID不能为空')
            .bail()
            .isArray({ min: 1 }).withMessage('用户ID无效'),
    ]
}

exports.update_kyc = () => {
    return [
        check('nrc_name', { msg: '姓名不能为空' }).not().isEmpty(),
        check('nrc_number').not().isEmpty().withMessage('身份证号不能为空')
            .isLength({ min: 18, max: 18 }).withMessage('身份证号必须为18位'),
            // .custom(value => {
            //     const city = {
            //         11: '北京', 12: '天津', 13: '河北', 14: '山西', 15: '内蒙古',
            //         21: '辽宁', 22: '吉林', 23: '黑龙江', 31: '上海', 32: '江苏',
            //         33: '浙江', 34: '安徽', 35: '福建', 36: '江西', 37: '山东',
            //         41: '河南', 42: '湖北', 43: '湖南', 44: '广东', 45: '广西',
            //         46: '海南', 50: '重庆', 51: '四川', 52: '贵州', 53: '云南',
            //         54: '西藏', 61: '陕西', 62: '甘肃', 63: '青海', 64: '宁夏',
            //         65: '新疆', 71: '台湾', 81: '香港', 82: '澳门', 91: '国外'
            //     };
            //     // 身份证格式（18位）
            //     const idCardReg = /^[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i;
            //     if (!idCardReg.test(value)) {
            //         throw new Error('身份证号格式错误');
            //     }
            //     // 地区码
            //     if (!city[value.substring(0, 2)]) {
            //         throw new Error('身份证号格式错误');
            //     }
            //     // 校验位
            //     const factor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
            //     const parity = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
                
            //     const chars = value.toUpperCase().split('');
            //     let sum = 0;
            //     for (let i = 0; i < 17; i++) {
            //         sum += parseInt(chars[i], 10) * factor[i];
            //     }

            //     const last = parity[sum % 11];

            //     if (last !== chars[17]) {
            //         throw new Error('身份证号格式错误');
            //     }

            //     return true;
            // }),
    ]
}

exports.win_whitelist = () => {
    return [
        check('win_per_day')
            .not().isEmpty().withMessage('值不能为空')
            .bail()
            .isNumeric()
            .withMessage('值必须是数字')
    ]
}

exports.change_password = () => {
    return [
        // check('login_password', { msg: '登录密码不能为空' }).not().isEmpty(),
        check('password')
            .not().isEmpty().withMessage('新密码不能为空')
            .isLength({ min: 8 }).withMessage('密码至少需要8个字符')
    ]
}

exports.update_agreement_status = () => {
    return [
        check('agreement_status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.update_political_vetting_status = () => {
    return [
        check('political_vetting_status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.gold_price_changes = () => {
    return [
        check('rate')
            .not().isEmpty().withMessage('储备持仓收益不能为空')
            .bail()
            .isFloat({ min: 0, max: 100 }).withMessage('储备持仓收益无效'),
        check('percentage')
            .not().isEmpty().withMessage('储备收益率不能为空')
            .bail()
            .isFloat({ min: 0, max: 100 }).withMessage('储备收益率无效'),
    ]
}

exports.update_transfer_status = () => {
    return [
        check('status')
            .not().isEmpty().withMessage('状态不能为空')
            .bail()
            .isIn(['APPROVED', 'DENIED'])
            .withMessage('状态无效')
    ]
}

exports.create_redempt_code = () => {
    return [
        check('type').not().isEmpty().withMessage('类型不能为空')
            .bail()
            .isNumeric()
            .withMessage('类型必须是数字')
            .bail()
            .isIn([1, 2, 3, 4, 5])
            .withMessage('类型无效'),
        check('redempt_code', { msg: '兑换码不能为空' }).not().isEmpty(),
        check('phone', { msg: '手机号不能为空' }).not().isEmpty(),
        check('amount', { msg: '金额不能为空' }).not().isEmpty()
            .bail()
            .isNumeric()
            .withMessage('金额必须是数字'),
    ]
}

exports.update_wallet = () => {
    return [
        check('walletType')
            .not().isEmpty().withMessage('钱包类型不能为空')
            .bail()
            .isIn([1,2,3])
            .withMessage('钱包类型必须是 1、2 或 3'),
        check('addOrSubstract')
            .not().isEmpty().withMessage('操作类型不能为空')
            .bail()
            .isIn([1,2]) // 1 => add | 2 => substract
            .withMessage('操作类型必须是 1（增加） 或 2（减少）'),
        check('amount')
            .not().isEmpty().withMessage('金额不能为空')
            .bail()
            .isNumeric()
            .withMessage('金额必须是数字'),
    ]
}

exports.update_contact_info = () => {
    return [
        check('contact_info', { msg: '联系信息不能为空' }).not().isEmpty(),
    ]
}

exports.setup_2fa = () => {
    return [
        check('email', { msg: '邮箱不能为空' }).not().isEmpty().isEmail().withMessage('邮箱格式不正确'),
    ];
}

exports.enable_2fa = () => {
    return [
        check('token', { msg: 'Token不能为空' }).not().isEmpty(),
    ];
}

exports.update_bank = () => {
    return [
        check('bank_card_number', { msg: '银行卡号不能为空' }).not().isEmpty(),
        check('bank_card_name', { msg: '开户姓名不能为空' }).not().isEmpty(),
        check('bank_card_phone_number')
            .not().isEmpty().withMessage('预留手机号不能为空')
            .isLength({ min: 11, max: 11 }).withMessage('手机号必须为11位数字'),
        check('open_bank_name', { msg: '开户银行不能为空' }).not().isEmpty(),
    ];
}

exports.update_alipay = () => {
    return [
        check('ali_account_name', { msg: '支付宝姓名不能为空' }).not().isEmpty(),   
        check('ali_account_number', { msg: '支付宝账号不能为空' }).not().isEmpty(),
    ];
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
        check('nrc_front_pic', { msg: '请上传身份证正面照片' }).not().isEmpty(),
        check('nrc_back_pic', { msg: '请上传身份证背面照片' }).not().isEmpty(),
        check('nrc_hold_pic', { msg: '请上传手持身份证照片' }).not().isEmpty(),
    ]
}

exports.assign_roles = () => {
    return [
        check('roleIds').not().isEmpty().withMessage('角色ID不能为空')
            .bail()
            .isArray({ min: 1 }).withMessage('角色ID无效'),
    ]
}

exports.create_role = () => {
    return [
        check('code', { msg: '角色代码不能为空' }).not().isEmpty(),
        check('name', { msg: '角色名称不能为空' }).not().isEmpty(),
    ]
}

exports.update_role = () => {
    return [
        check('name', { msg: '角色名称不能为空' }).not().isEmpty(),
    ]
}

exports.assign_permissions = () => {
    return [
        check('permissionIds').not().isEmpty().withMessage('权限ID不能为空')
            .bail()
            .isArray({ min: 1 }).withMessage('权限ID无效'),
    ]
}