const express = require('express');

class AdminRoute extends express.Router {
    constructor(app) {
        super();

        let FormValidator = require('../helpers/FormValidator.Admin');
        let Middleware = require('../middlewares/AdminMiddleware');
        let middleware = new Middleware(app);

        let AuthController = require('../controllers/admins/AuthController');
        let AuthCtrl = new AuthController(app);
        this.get('/get-recaptcha', AuthCtrl.GET_RECAPTCHA);
        this.get('/check-2fa-enabled', AuthCtrl.CHECK_2FA_ENABLED);
        this.post('/login', FormValidator.login(), AuthCtrl.LOGIN);
        this.get('/profile', middleware.isLoggedIn(), AuthCtrl.PROFILE);
        this.post('/logout', middleware.isLoggedIn(), AuthCtrl.LOGOUT);

        let DashboardController = require('../controllers/admins/DashboardController');
        let DashboardCtrl = new DashboardController();
        this.get('/dashboard/summary', middleware.isLoggedIn(), DashboardCtrl.DASHBOARD_SUMMARY);
        this.get('/dashboard/dw-chart', middleware.isLoggedIn(), DashboardCtrl.DW_CHART);
        this.get('/dashboard/recent-dw-list', middleware.isLoggedIn(), DashboardCtrl.RECENT_DW_LIST);

        let ConfigController = require('../controllers/admins/ConfigController');
        let ConfigCtrl = new ConfigController(app);
        this.get('/get-file-path', middleware.isLoggedIn(), ConfigCtrl.GET_FILE_PATH);
        this.get('/configs', middleware.isLoggedIn('config-list'), ConfigCtrl.INDEX);
        this.post('/configs/:id/update', FormValidator.update_config('config-update'), middleware.isLoggedIn(), ConfigCtrl.UPDATE);

        let CertificateController = require('../controllers/admins/CertificateController');
        let CertCtrl = new CertificateController();
        this.get('/certificates', middleware.isLoggedIn(), CertCtrl.INDEX);
        this.post('/certificates/create', FormValidator.create_certificate(), middleware.isLoggedIn(), CertCtrl.CREATE);
        this.post('/certificates/:id/update', FormValidator.update_certificate(), middleware.isLoggedIn(), CertCtrl.UPDATE);
        this.post('/certificates/:id/update-status', FormValidator.update_status(), middleware.isLoggedIn(), CertCtrl.UPDATE_STATUS);
        this.post('/certificates/upload', middleware.isLoggedIn(), CertCtrl.UPLOAD);
        this.post('/certificates/:id/delete', middleware.isLoggedIn(), CertCtrl.DELETE);

        let DWController = require('../controllers/admins/DWController');
        let DWCtrl = new DWController();
        this.get('/deposit-list', middleware.isLoggedIn('recharge-management-list'), DWCtrl.DEPOSIT_LIST);
        this.get('/withdraw-list', middleware.isLoggedIn('withdraw-management-list'), DWCtrl.WITHDRAW_LIST);
        this.get('/export-withdraw', middleware.isLoggedIn(), DWCtrl.EXPORT_WITHDRAW);
        this.post('/import-withdraw', middleware.isLoggedIn(), DWCtrl.IMPORT_WITHDRAW);

        let EarnController = require('../controllers/admins/EarnController');
        let EarnCtrl = new EarnController();
        this.get('/earns', middleware.isLoggedIn('yuebao-income-list'), EarnCtrl.INDEX);

        let ImpeachController = require('../controllers/admins/ImpeachController');
        let ImpeachCtrl = new ImpeachController(app);
        this.get('/impeaches', middleware.isLoggedIn('impeachment-list'), ImpeachCtrl.INDEX);
        this.post('/impeaches/:id/update', FormValidator.update_impeach(), middleware.isLoggedIn('impeachment-update'), ImpeachCtrl.UPDATE);

        let InformationController = require('../controllers/admins/InformationController');
        let InfoCtrl = new InformationController();
        this.get('/informations', middleware.isLoggedIn('material-list'), InfoCtrl.INDEX);
        this.post('/informations/create', FormValidator.create_info(), middleware.isLoggedIn('material-add'), InfoCtrl.CREATE);
        this.post('/informations/:id/update', FormValidator.update_info(), middleware.isLoggedIn('material-update'), InfoCtrl.UPDATE);
        this.post('/informations/:id/update-status', FormValidator.update_status(), middleware.isLoggedIn('material-change-status'), InfoCtrl.UPDATE_STATUS);
        this.post('/informations/upload', middleware.isLoggedIn(), InfoCtrl.UPLOAD);
        this.post('/informations/:id/delete', middleware.isLoggedIn('material-delete'), InfoCtrl.DELETE);

        let InheritController = require('../controllers/admins/InheritController');
        let InheritCtrl = new InheritController();
        this.get('/inherits', middleware.isLoggedIn('transfer-inheritance-list'), InheritCtrl.INDEX);
        this.post('/inherits/:id/update', FormValidator.update_inherit(), middleware.isLoggedIn('transfer-inheritance-approve,transfer-inheritance-reject'), InheritCtrl.UPDATE);

        let MasonicFundController = require('../controllers/admins/MasonicFundController');
        let MasonicCtrl = new MasonicFundController();
        this.get('/masonic-fund-history', middleware.isLoggedIn('masonic-fund-list'), MasonicCtrl.INDEX);
        this.post('/masonic-fund/substract', middleware.isLoggedIn('masonic-fund-import-deduction'), MasonicCtrl.SUBSTRACT_MASONIC_FUND);
        this.get('/masonic-fund/temp-history', middleware.isLoggedIn('masonic-fund-user-not-register-list'), MasonicCtrl.TEMP_HISTORY);
        this.post('/masonic-fund-history/:id/update-status', FormValidator.update_masonic_fund_status(), middleware.isLoggedIn('masonic-fund-approve,masonic-fund-reject'), MasonicCtrl.UPDATE_FUND_STATUS);

        let NewsController = require('../controllers/admins/NewsController');
        let NewsCtrl = new NewsController();
        this.post('/oss/get-sign-url', FormValidator.get_oss_sign(), middleware.isLoggedIn(), NewsCtrl.GET_ALIOSS_SIGN);
        this.get('/news', middleware.isLoggedIn('news-list'), NewsCtrl.INDEX);
        this.post('/news/create', FormValidator.create_news(), middleware.isLoggedIn('news-add'), NewsCtrl.CREATE);
        this.post('/news/:id/update', FormValidator.update_news(), middleware.isLoggedIn('news-update'), NewsCtrl.UPDATE);
        this.post('/news/:id/update-status', FormValidator.update_news_status(), middleware.isLoggedIn('news-change-status'), NewsCtrl.UPDATE_STATUS);
        this.post('/news/upload', middleware.isLoggedIn(), NewsCtrl.UPLOAD);
        this.post('/news/:id/delete', middleware.isLoggedIn('news-delete'), NewsCtrl.DELETE);
        this.get('/news/reported-list', middleware.isLoggedIn('news-report-list'), NewsCtrl.REPORTED_LIST);
        this.post('/news-reports/:id/update-status', FormValidator.update_news_status(), middleware.isLoggedIn('news-report-approve,news-report-reject'), NewsCtrl.UPDATE_REPORT_STATUS);

        let NotificationController = require('../controllers/admins/NotificationController');
        let NotiCtrl = new NotificationController();
        this.get('/notifications', middleware.isLoggedIn('announcement-list'), NotiCtrl.INDEX);
        this.post('/notifications/create', FormValidator.create_noti(), middleware.isLoggedIn('announcement-add'), NotiCtrl.CREATE);
        this.post('/notifications/:id/update', FormValidator.create_noti(), middleware.isLoggedIn('announcement-update'), NotiCtrl.UPDATE);
        this.post('/notifications/:id/update-status', FormValidator.update_status(), middleware.isLoggedIn('announcement-change-status'), NotiCtrl.UPDATE_STATUS);
        this.post('/notifications/:id/delete', middleware.isLoggedIn('announcement-delete'), NotiCtrl.DELETE);

        let RankController = require('../controllers/admins/RankController');
        let RankCtrl = new RankController(app);
        this.get('/ranks', middleware.isLoggedIn('military-rank-list'), RankCtrl.INDEX);
        this.post('/ranks/:id/update', FormValidator.update_rank(), middleware.isLoggedIn('military-rank-update'), RankCtrl.UPDATE);
        this.post('/ranks/:id/upload', middleware.isLoggedIn('military-rank-upload-icon'), RankCtrl.UPLOAD);

        let RewardController = require('../controllers/admins/RewardController');
        let RewardCtrl = new RewardController(app);
        this.get('/reward-types', middleware.isLoggedIn('redpacket-prize-list'), RewardCtrl.REWARD_TYPES);
        this.post('/reward-types/:id/set-as-energy-forum', FormValidator.set_as_energy_forum(), middleware.isLoggedIn('redpacket-prize-change-energy-forum-status'), RewardCtrl.SET_AS_ENERGY_FORUM);
        this.post('/reward-types/:id/update', FormValidator.update_reward_type(), middleware.isLoggedIn('redpacket-prize-update'), RewardCtrl.UPDATE_REWARD_TYPE);
        this.post('/reward-types/:id/update-status', FormValidator.update_status(), middleware.isLoggedIn('redpacket-prize-change-status'), RewardCtrl.UPDATE_REWARD_TYPE_STATUS);
        this.get('/reward-history', middleware.isLoggedIn('redpacket-list'), RewardCtrl.REWARD_HISTORY);
        this.get('/referral-reward-settings', middleware.isLoggedIn('forum-setting-list'), RewardCtrl.REFERRAL_REWARD_SETTINGS);
        this.post('/referral-reward-settings/create', FormValidator.create_referral_reward_setting(), middleware.isLoggedIn('forum-setting-add'), RewardCtrl.CREATE_REFERRAL_REWARD_SETTING);
        this.post('/referral-reward-settings/:id/update', FormValidator.create_referral_reward_setting(), middleware.isLoggedIn('forum-setting-update'), RewardCtrl.UPDATE_REFERRAL_REWARD_SETTING);
        this.post('/referral-reward-settings/:id/delete', middleware.isLoggedIn('forum-setting-delete'), RewardCtrl.DELETE_REFERRAL_REWARD_SETTING);

        let TicketController = require('../controllers/admins/TicketController');
        let TicketCtrl = new TicketController();
        this.get('/tickets', middleware.isLoggedIn('military-allowance-ticket-list'), TicketCtrl.TICKET_LIST);
        this.post('/tickets/:id/update', FormValidator.update_ticket(), middleware.isLoggedIn('military-allowance-ticket-update'), TicketCtrl.UPDATE_TICKET);
        this.get('/ticket-history', middleware.isLoggedIn('military-allowance-ticket-list'), TicketCtrl.TICKET_HISTORY);

        let TransferController = require('../controllers/admins/TransferController');
        let TransferCtrl = new TransferController();
        this.get('/transfers', middleware.isLoggedIn('wallet-transfer-list'), TransferCtrl.INDEX);
        this.post('/transfers/:id/update-status', FormValidator.update_transfer_status(), middleware.isLoggedIn('wallet-transfer-approve,wallet-transfer-reject'), TransferCtrl.UPDATE_STATUS);

        let UserController = require('../controllers/admins/UserController');
        let UserCtrl = new UserController(app);
        this.get('/users', middleware.isLoggedIn('user-list'), UserCtrl.INDEX);
        this.get('/user-certificates', middleware.isLoggedIn(), UserCtrl.CERTIFICATE_LIST);
        this.get('/user-bonuses', middleware.isLoggedIn('referral-bonus-list'), UserCtrl.BONUS_LIST);
        this.get('/user-rank-points', middleware.isLoggedIn('user-rankpoint-list'), UserCtrl.RANK_POINT_LIST);
        this.post('/users/:id/update-status', FormValidator.update_status(), middleware.isLoggedIn('user-disable-enable'), UserCtrl.UPDATE_USER_STATUS);
        this.post('/users/:id/set-win-whitelist', FormValidator.win_whitelist(), middleware.isLoggedIn('user-set-winning-count'), UserCtrl.UPDATE_WIN_WHITELIST);
        this.post('/users/:id/change-password', FormValidator.change_password(), middleware.isLoggedIn('user-change-password'), UserCtrl.CHANGE_PASSWORD);
        this.post('/users/:id/update-agreement-status', FormValidator.update_agreement_status(), middleware.isLoggedIn('user-approve-loan-agreement,user-reject-loan-agreement'), UserCtrl.UPDATE_AGREEMENT_STATUS);
        // this.post('/users/:id/update-political-vetting-status', FormValidator.update_political_vetting_status(), middleware.isLoggedIn(), UserCtrl.UPDATE_POLITICAL_VETTING_STATUS);
        this.post('/users/:id/set-to-internal-account', middleware.isLoggedIn('user-set-internal-account'), UserCtrl.SET_TO_INTERNAL_ACCOUNT);
        this.get('/users/child-summary', middleware.isLoggedIn('user-child-summary'), UserCtrl.CHILD_SUMMARY);
        this.get('/users/:id/superior-internal-account', middleware.isLoggedIn('user-view-superior'), UserCtrl.SUPERIOR_INTERNAL_ACCOUNT);
        this.get('/users/allowance-history', middleware.isLoggedIn('allowance-issue-list'), UserCtrl.ALLOWANCE_HISTORY);
        this.get('/users/child-register-list', middleware.isLoggedIn('user-view-subordinate'), UserCtrl.CHILD_REGISTER_LIST);
        this.post('/users/:id/update-wallet', FormValidator.update_wallet(), middleware.isLoggedIn('user-add-substract'), UserCtrl.UPDATE_WALLET);
        this.post('/users/:id/update-contact-info', FormValidator.update_contact_info(), middleware.isLoggedIn('user-change-contact'), UserCtrl.UPDATE_CONTACT_INFO);
        // 2FA
        this.post('/users/:id/setup-2fa', FormValidator.setup_2fa(), middleware.isLoggedIn(), UserCtrl.SETUP_2FA);
        this.post('/users/:id/disable-2fa', FormValidator.enable_2fa(), middleware.isLoggedIn(), UserCtrl.DISABLE_2FA);
        this.post('/users/:id/enable-2fa', FormValidator.enable_2fa(), middleware.isLoggedIn(), UserCtrl.VERIFY_2FA);
        // KYC
        this.get('/kyc-list', middleware.isLoggedIn('kyc-list'), UserCtrl.KYC_LIST);
        this.post('/kyc/:id/update-kyc-status', FormValidator.update_kyc_status(), middleware.isLoggedIn('kyc-update'), UserCtrl.UPDATE_KYC_STATUS);
        this.post('/kyc/approved-multiple', FormValidator.approved_multiple_kyc(), middleware.isLoggedIn('kyc-multiple-approve'), UserCtrl.APPROVED_MULTIPLE_KYC);
        this.post('/kyc/denied-multiple', FormValidator.approved_multiple_kyc(), middleware.isLoggedIn('kyc-multiple-reject'), UserCtrl.DENIED_MULTIPLE_KYC);
        this.post('/users/:id/add-kyc', FormValidator.verify_kyc(), middleware.isLoggedIn('kyc-add'), UserCtrl.ADD_KYC);
        this.post('/kyc/:id/update-kyc', FormValidator.update_kyc(), middleware.isLoggedIn('kyc-update'), UserCtrl.UPDATE_KYC);
        this.post('/kyc/:id/delete-kyc', middleware.isLoggedIn('kyc-delete'), UserCtrl.DELETE_KYC);
        this.get('/users/find-user-by-phone', middleware.isLoggedIn(), UserCtrl.FIND_USER);
        this.post('/users/:id/upload-kyc/:type', middleware.isLoggedIn('kyc-update'), UserCtrl.UPLOAD_KYC);
        // Payment Methods
        this.get('/payment-methods', middleware.isLoggedIn('bankcard-list'), UserCtrl.PAYMENT_METHODS);
        this.post('/payment-methods/get-sign-url', FormValidator.get_payment_method_oss_sign(), middleware.isLoggedIn(), UserCtrl.UPLOAD_PAYMENT_METHOD_OSS_SIGN);
        this.post('/payment-methods/:id/update-pic-link', FormValidator.update_payment_method_pic_link(), middleware.isLoggedIn(), UserCtrl.UPDATE_PAYMENT_METHOD_PIC_LINK);
        this.post('/payment-methods/:id/update-bank', FormValidator.update_bank(), middleware.isLoggedIn('bankcard-update'), UserCtrl.UPDATE_BANK);
        this.post('/payment-methods/:id/update-alipay', FormValidator.update_alipay(), middleware.isLoggedIn('alipay-update'), UserCtrl.UPDATE_ALIPAY);
        this.post('/payment-methods/:id/update-bank-status', FormValidator.update_kyc_status(), middleware.isLoggedIn('bankcard-status-update'), UserCtrl.UPDATE_BANK_STATUS);
        this.post('/payment-methods/:id/update-alipay-status', FormValidator.update_kyc_status(), middleware.isLoggedIn('alipay-status-update'), UserCtrl.UPDATE_ALI_STATUS);
        // Set Roles
        this.post('/users/:id/assign-roles', FormValidator.assign_roles(), middleware.isLoggedIn('user-assign-role'), UserCtrl.ASSIGN_ROLES_TO_USER);

        let LogController = require('../controllers/admins/LogController');
        let LogCtrl = new LogController();
        this.get('/logs', middleware.isLoggedIn('log-list'), LogCtrl.INDEX);

        let GoldController = require('../controllers/admins/GoldController');
        let GoldCtrl = new GoldController(app);
        this.get('/gold-prices/changes-percentage', middleware.isLoggedIn(), GoldCtrl.GET_GOLD_PRICE_CHANGES);
        this.post('/gold-prices/update-changes-percentage', FormValidator.gold_price_changes(), middleware.isLoggedIn('gold-price-increase-update,gold-price-interest-update'), GoldCtrl.UPDATE_GOLD_PRICE_CHANGES);
        this.get('/gold-prices/history', middleware.isLoggedIn('gold-price-list'), GoldCtrl.GOLD_PRICE_HISTORY);
        this.post('/gold-prices/:id/update', middleware.isLoggedIn('gold-price-update'), GoldCtrl.UPDATE_GOLD_PRICE);
        this.get('/gold-prices/user-buy-sell-records', middleware.isLoggedIn('gold-trade-list'), GoldCtrl.USER_GOLD_HISTORY);
        this.get('/gold-prices/interest-records', middleware.isLoggedIn('gold-income-list'), GoldCtrl.GOLD_INTEREST_HISTORY);

        let BannerController = require('../controllers/admins/BannerController');
        let BannerCtrl = new BannerController(app);
        this.get('/banners', middleware.isLoggedIn('carousel-list'), BannerCtrl.INDEX);
        this.post('/banners/upload', middleware.isLoggedIn('carousel-add'), BannerCtrl.UPLOAD);
        this.post('/banners/:id/delete', middleware.isLoggedIn('carousel-delete'), BannerCtrl.DELETE);

        let RedemptCodeController = require('../controllers/admins/RedemptController');
        let RedemptCtrl = new RedemptCodeController(app);
        this.get('/redempt-codes', middleware.isLoggedIn('redeem-code-list'), RedemptCtrl.INDEX);
        this.post('/redempt-codes/create', FormValidator.create_redempt_code(), middleware.isLoggedIn('redeem-code-create'), RedemptCtrl.CREATE_CODE);

        let MerchantController = require('../controllers/admins/MerchantController');
        let MerchantCtrl = new MerchantController(app);
        this.get('/merchants', middleware.isLoggedIn(), MerchantCtrl.INDEX);
        this.post('/merchants/:id/change-status', FormValidator.update_status(), middleware.isLoggedIn(), MerchantCtrl.CHANGE_STATUS);

        let RoleController = require('../controllers/admins/RoleController');
        let RoleCtrl = new RoleController();
        this.get('/roles/list', middleware.isLoggedIn('role-list'), RoleCtrl.ROLES);
        this.get('/roles/permission-list', middleware.isLoggedIn(), RoleCtrl.PERMISSIONS);
        this.get('/roles/:id/permissions', middleware.isLoggedIn(), RoleCtrl.ROLE_HAS_PERMISSIONS);
        this.post('/roles/create', FormValidator.create_role(), middleware.isLoggedIn('role-add'), RoleCtrl.CREATE_ROLE);
        this.post('/roles/:id/update', FormValidator.update_role(), middleware.isLoggedIn('role-update'), RoleCtrl.UPDATE_ROLE);
        this.post('/roles/:id/delete', middleware.isLoggedIn('role-delete'), RoleCtrl.DELETE_ROLE);
        this.post('/roles/:id/assign-permissions', FormValidator.assign_permissions(), middleware.isLoggedIn('role-assign-permission'), RoleCtrl.ASSIGN_PERMISSIONS_TO_ROLE);
    }
}

module.exports = AdminRoute