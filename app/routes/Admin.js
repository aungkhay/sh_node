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
        this.get('/dashboard/masonic-fund-summary', middleware.isLoggedIn(), DashboardCtrl.MASONIC_FUND_SUMMARY);
        this.get('/dashboard/check-in-summary', middleware.isLoggedIn(), DashboardCtrl.CHECKIN_SUMMARY);
        this.get('/dashboard/today-user-active-count', middleware.isLoggedIn(), DashboardCtrl.TODAY_ACTIVE_USER_COUNT);
        this.get('/dashboard/withdraw-summary', middleware.isLoggedIn(), DashboardCtrl.WITHDRAW_SUMMARY);
        this.get('/dashboard/dw-chart', middleware.isLoggedIn(), DashboardCtrl.DW_CHART);
        this.get('/dashboard/recent-dw-list', middleware.isLoggedIn(), DashboardCtrl.RECENT_DW_LIST);

        let ConfigController = require('../controllers/admins/ConfigController');
        let ConfigCtrl = new ConfigController(app);
        this.get('/get-file-path', middleware.isLoggedIn(), ConfigCtrl.GET_FILE_PATH);
        this.get('/configs', middleware.isLoggedIn('config-list'), ConfigCtrl.INDEX);
        this.post('/configs/:id/update', FormValidator.update_config('config-update,announcement-popup-notification'), middleware.isLoggedIn(), ConfigCtrl.UPDATE);

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
        this.post('/deposit-list/:id/approve', middleware.isLoggedIn('recharge-management-approve'), DWCtrl.APPROVE_DEPOSIT);
        this.post('/deposit-list/:id/reject', middleware.isLoggedIn('recharge-management-reject'), DWCtrl.REJECT_DEPOSIT);
        this.post('/deposit-list/:id/repair-failed', middleware.isLoggedIn('recharge-management-repair'), DWCtrl.REPAIR_FIALED_DEPOSIT);
        this.get('/withdraw-list', middleware.isLoggedIn('withdraw-management-list'), DWCtrl.WITHDRAW_LIST);
        this.post('/withdraw-list/:id/reject', middleware.isLoggedIn('withdraw-management-reject'), DWCtrl.REJECT_WITHDRAW);
        this.get('/export-withdraw', middleware.isLoggedIn('withdraw-management-export'), DWCtrl.EXPORT_WITHDRAW);
        this.post('/export-withdraw-by-phone_numbers', FormValidator.export_withdraw_by_phones(), middleware.isLoggedIn('withdraw-management-export'), DWCtrl.EXPORT_WITHDRAW_BY_PHONES);
        this.post('/import-withdraw', middleware.isLoggedIn('withdraw-management-import'), DWCtrl.IMPORT_WITHDRAW);
        // Boss
        this.get('/boss/withdraw-list', DWCtrl.BOSS_WITHDRAW_LIST);
        this.get('/boss/deposit-list', DWCtrl.BOSS_DEPOSIT_LIST);

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
        this.post('/masonic-fund-history/approve-by-excel', middleware.isLoggedIn('masonic-fund-approve'), MasonicCtrl.UPDATE_FUND_STATUS_BY_EXCEL);

        // Masonic Package
        let MasonicPackageController = require('../controllers/admins/MasonicPackageController');
        let MasonicPackageCtrl = new MasonicPackageController(app);
        this.get('/masonic-packages', middleware.isLoggedIn('masonic-package-list'), MasonicPackageCtrl.INDEX);
        this.post('/masonic-packages/:id/upload', MasonicPackageCtrl.UPLOAD);
        this.post('/masonic-packages/create', FormValidator.update_masonic_package(), middleware.isLoggedIn('masonic-package-create'), MasonicPackageCtrl.CREATE);
        this.post('/masonic-packages/:id/update', FormValidator.update_masonic_package(), middleware.isLoggedIn('masonic-package-update'), MasonicPackageCtrl.UPDATE);
        this.get('/masonic-package/history', middleware.isLoggedIn('masonic-package-history-list'), MasonicPackageCtrl.MASONIC_PACKAGE_HISTORY);
        this.get('/masonic-package/bonus-history', middleware.isLoggedIn('masonic-package-bonus-history-list'), MasonicPackageCtrl.MASONIC_PACKAGE_BONUS_HISTORY);
        this.get('/masonic-package/earn-history', middleware.isLoggedIn('masonic-package-earn-history-list'), MasonicPackageCtrl.MASONIC_PACKAGE_EARN_HISTORY);

        let NewsController = require('../controllers/admins/NewsController');
        let NewsCtrl = new NewsController(app);
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
        // Reward Types
        this.get('/reward-types', middleware.isLoggedIn('redpacket-prize-list'), RewardCtrl.REWARD_TYPES);
        this.post('/reward-types/:id/set-as-energy-forum', FormValidator.set_as_energy_forum(), middleware.isLoggedIn('redpacket-prize-change-energy-forum-status'), RewardCtrl.SET_AS_ENERGY_FORUM);
        this.post('/reward-types/:id/update', FormValidator.update_reward_type(), middleware.isLoggedIn('redpacket-prize-update'), RewardCtrl.UPDATE_REWARD_TYPE);
        this.post('/reward-types/:id/update-status', FormValidator.update_status(), middleware.isLoggedIn('redpacket-prize-change-status'), RewardCtrl.UPDATE_REWARD_TYPE_STATUS);
        // Reward Records
        this.get('/reward-history', middleware.isLoggedIn('redpacket-list'), RewardCtrl.REWARD_HISTORY);
        this.post('/rewards/add-reward', FormValidator.add_reward_record(), middleware.isLoggedIn('redpacket-add'), RewardCtrl.ADD_REWARD);
        this.post('/rewards/:id/delete-reward', middleware.isLoggedIn('redpacket-delete'), RewardCtrl.DELETE_REWARD);
        this.post('/rewards/delete-multiple-rewards', FormValidator.delete_multiple_rewards(), middleware.isLoggedIn('redpacket-multiple-delete'), RewardCtrl.MULTIPLE_DELETE_REWARD);
        this.post('/rewards/delete-all-rewards', middleware.isLoggedIn('redpacket-delete-all-background-added'), RewardCtrl.DELETE_ALL_BACKGROUND_ADDED_REWARD);
        // Referral Reward Settings
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
        this.get('/users/buy-authorization-letter-history', middleware.isLoggedIn('buy-authorization-letter-history'), UserCtrl.BUY_AUTHORIZATION_LETTER_HISTORY);
        this.get('/user-bonuses', middleware.isLoggedIn('referral-bonus-list'), UserCtrl.BONUS_LIST);
        this.get('/user-rank-points', middleware.isLoggedIn('user-rankpoint-list'), UserCtrl.RANK_POINT_LIST);
        this.post('/users/:id/update-status', FormValidator.update_status(), middleware.isLoggedIn('user-disable-enable'), UserCtrl.UPDATE_USER_STATUS);
        this.post('/users/:id/set-win-whitelist', FormValidator.win_whitelist(), middleware.isLoggedIn('user-set-winning-count'), UserCtrl.UPDATE_WIN_WHITELIST);
        this.post('/users/:id/change-password', FormValidator.change_password(), middleware.isLoggedIn('user-change-password'), UserCtrl.CHANGE_PASSWORD);
        this.post('/users/:id/change-payment-password', FormValidator.change_payment_password(), middleware.isLoggedIn('user-change-payment-password'), UserCtrl.CHANGE_PAYMENT_PASSWORD);
        this.post('/users/:id/update-agreement-status', FormValidator.update_agreement_status(), middleware.isLoggedIn('user-approve-loan-agreement,user-reject-loan-agreement'), UserCtrl.UPDATE_AGREEMENT_STATUS);
        // this.post('/users/:id/update-political-vetting-status', FormValidator.update_political_vetting_status(), middleware.isLoggedIn(), UserCtrl.UPDATE_POLITICAL_VETTING_STATUS);
        this.post('/users/:id/set-to-internal-account', middleware.isLoggedIn('user-set-internal-account'), UserCtrl.SET_TO_INTERNAL_ACCOUNT);
        this.get('/users/child-summary', middleware.isLoggedIn('user-child-summary'), UserCtrl.CHILD_SUMMARY);
        this.get('/users/:id/superior-internal-account', middleware.isLoggedIn('user-view-superior'), UserCtrl.SUPERIOR_INTERNAL_ACCOUNT);
        this.get('/users/allowance-history', middleware.isLoggedIn('allowance-issue-list'), UserCtrl.ALLOWANCE_HISTORY);
        this.get('/users/child-register-list', middleware.isLoggedIn('user-view-subordinate'), UserCtrl.CHILD_REGISTER_LIST);
        this.get('/users/export-child-register-list', middleware.isLoggedIn('user-export-subordinate'), UserCtrl.EXPORT_CHILD_REGISTER_LIST);
        this.post('/users/:id/update-wallet', FormValidator.update_wallet(), middleware.isLoggedIn('user-add-substract'), UserCtrl.UPDATE_WALLET);
        this.post('/users/release-balance-by-excel', middleware.isLoggedIn('user-add-substract'), UserCtrl.IMPORT_RELEASE_BALANCE);
        this.post('/users/:id/update-contact-info', FormValidator.update_contact_info(), middleware.isLoggedIn('user-change-contact'), UserCtrl.UPDATE_CONTACT_INFO);
        this.get('/users/:id/money-tracking', middleware.isLoggedIn('user-list'), UserCtrl.MONEY_TRACKING);
        this.get('/users/:id/cash-flow', middleware.isLoggedIn('user-list'), UserCtrl.CASH_FLOW);
        this.get('/gold-coupon-user-count', middleware.isLoggedIn(), UserCtrl.GOLD_COUPON_USER_COUNT);
        this.get('/export-user-wallet', middleware.isLoggedIn(), UserCtrl.EXPORT_WALLET);
        this.get('/export-users', middleware.isLoggedIn('user-list'), UserCtrl.EXPORT_USER);
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
        this.post('/payment-methods/:id/update-fenxiang', FormValidator.update_fenxiang(), middleware.isLoggedIn('fenxiang-update'), UserCtrl.UPDATE_FENXIANG);
        this.post('/payment-methods/:id/update-bank-status', FormValidator.update_kyc_status(), middleware.isLoggedIn('bankcard-status-update'), UserCtrl.UPDATE_BANK_STATUS);
        this.post('/payment-methods/:id/update-alipay-status', FormValidator.update_kyc_status(), middleware.isLoggedIn('alipay-status-update'), UserCtrl.UPDATE_ALI_STATUS);
        // Set Roles
        this.post('/users/:id/assign-roles', FormValidator.assign_roles(), middleware.isLoggedIn('user-assign-role'), UserCtrl.ASSIGN_ROLES_TO_USER);
        this.post('/users/:id/generate-withdraw-active-code', middleware.isLoggedIn('user-generate-withdraw-active-code'), UserCtrl.GENERATE_WITHDRAW_ACTIVE_CODE);
        this.post('/users/generate-withdraw-active-code-by-excel', middleware.isLoggedIn('user-generate-withdraw-active-code'), UserCtrl.GENERATE_WITHDRAW_ACTIVE_CODE_BY_EXCEL);

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
        this.get('/gold-packages/history', middleware.isLoggedIn('gold-package-history-list'), GoldCtrl.GOLD_PACKAGE_HISTORY);
        this.get('/gold-packages/bonus-history', middleware.isLoggedIn('gold-package-bonus-history-list'), GoldCtrl.GOLD_PACKAGE_BONUS_HISTORY);
        this.get('/gold-packages/return-history', middleware.isLoggedIn('gold-package-return-history-list'), GoldCtrl.GOLD_PACKAGE_RETURN_HISTORY);
        this.get('/gold-packages/repurchase-history', middleware.isLoggedIn('gold-package-repurchase-history-list'), GoldCtrl.GOLD_PACKAGE_REPURCHASE_HISTORY);
        this.get('/gold-plan/check-in-history', middleware.isLoggedIn('gold-plan-check-in-history'), GoldCtrl.GOLD_PLAN_CHECK_IN_HISTORY);

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
        this.get('/merchants/payment-methods', middleware.isLoggedIn('merchant-list'), MerchantCtrl.PAYMENT_METHOD);
        this.get('/merchants', middleware.isLoggedIn('merchant-list'), MerchantCtrl.INDEX);
        this.post('/merchants/:id/change-status', FormValidator.update_status(), middleware.isLoggedIn('update-merchant-status'), MerchantCtrl.CHANGE_STATUS);
        this.get('/channels', middleware.isLoggedIn('channel-list'), MerchantCtrl.CHANNEL_LIST);
        this.post('/channels/create', FormValidator.create_channel(), middleware.isLoggedIn('create-channel'), MerchantCtrl.CHANNEL_CREATE);
        this.post('/channels/:id/update', FormValidator.create_channel(), middleware.isLoggedIn('update-channel'), MerchantCtrl.CHANNEL_UPDATE);
        this.post('/channels/:id/change-status', FormValidator.update_status(), middleware.isLoggedIn('update-channel-status'), MerchantCtrl.CHANGE_CHANNEL_STATUS);
        this.post('/channels/:id/sort', FormValidator.sort_channel(), middleware.isLoggedIn('update-channel'), MerchantCtrl.CHANNEL_SORT);

        let WithdrawMerchantController = require('../controllers/admins/WithdrawMerchantController');
        let WithdrawMerchantCtrl = new WithdrawMerchantController(app);
        this.get('/withdraw-merchants', middleware.isLoggedIn('merchant-list'), WithdrawMerchantCtrl.INDEX);
        this.post('/withdraw-merchants/:id/change-status', FormValidator.update_status(), middleware.isLoggedIn('update-merchant-status'), WithdrawMerchantCtrl.CHANGE_STATUS);
        this.get('/withdraw-channels', middleware.isLoggedIn('channel-list'), WithdrawMerchantCtrl.CHANNEL_LIST);
        this.post('/withdraw-channels/create', FormValidator.create_withdraw_channel(), middleware.isLoggedIn('create-channel'), WithdrawMerchantCtrl.CHANNEL_CREATE);
        this.post('/withdraw-channels/:id/update', FormValidator.create_withdraw_channel(), middleware.isLoggedIn('update-channel'), WithdrawMerchantCtrl.CHANNEL_UPDATE);
        this.post('/withdraw-channels/:id/change-status', FormValidator.update_status(), middleware.isLoggedIn('update-channel-status'), WithdrawMerchantCtrl.CHANGE_CHANNEL_STATUS);
        this.post('/withdraw-channels/:id/send-to-third-party', FormValidator.send_withdraw_to_third_party(), middleware.isLoggedIn('update-channel'), WithdrawMerchantCtrl.SEND_WITHDRAW_TO_THIRD_PARTY);

        let RoleController = require('../controllers/admins/RoleController');
        let RoleCtrl = new RoleController();
        this.get('/roles/list', middleware.isLoggedIn('role-list'), RoleCtrl.ROLES);
        this.get('/roles/permission-list', middleware.isLoggedIn(), RoleCtrl.PERMISSIONS);
        this.get('/roles/:id/permissions', middleware.isLoggedIn(), RoleCtrl.ROLE_HAS_PERMISSIONS);
        this.post('/roles/create', FormValidator.create_role(), middleware.isLoggedIn('role-add'), RoleCtrl.CREATE_ROLE);
        this.post('/roles/:id/update', FormValidator.update_role(), middleware.isLoggedIn('role-update'), RoleCtrl.UPDATE_ROLE);
        this.post('/roles/:id/delete', middleware.isLoggedIn('role-delete'), RoleCtrl.DELETE_ROLE);
        this.post('/roles/:id/assign-permissions', FormValidator.assign_permissions(), middleware.isLoggedIn('role-assign-permission'), RoleCtrl.ASSIGN_PERMISSIONS_TO_ROLE);

        // Spring Festival Event
        let SpringFestivalEventController = require('../controllers/admins/SpringFestivalEventController');
        let SpringFestivalEventCtrl = new SpringFestivalEventController(app);
        this.get('/spring-festival-event/joined-event-list', middleware.isLoggedIn('spring-festival-event-joined-list'), SpringFestivalEventCtrl.JOINED_EVENT_LIST);
        this.get('/spring-festival-event/check-in-logs', middleware.isLoggedIn('spring-festival-event-check-in-logs'), SpringFestivalEventCtrl.CHECK_IN_LOGS);
        // this.post('/spring-festival-event/give-repair-card', FormValidator.give_repair_card(), middleware.isLoggedIn('spring-festival-event-give-repair-card'), SpringFestivalEventCtrl.GIVE_PEPAIR_CARD);
        this.post('/spring-festival-event/add-white-list', FormValidator.spring_whitelist(), middleware.isLoggedIn('spring-festival-event-update-white-list'), SpringFestivalEventCtrl.ADD_WHITE_LIST);
        this.get('/spring-festival-event/white-list', middleware.isLoggedIn('spring-festival-event-view-white-list'), SpringFestivalEventCtrl.WHITE_LIST);
        this.post('/spring-festival-event/import-check-in', middleware.isLoggedIn('spring-festival-event-import-check-in'), SpringFestivalEventCtrl.GIVE_CHECK_IN);

        // Balance Transfer between users
        let BalanceTransferController = require('../controllers/admins/BalanceTransferController');
        let BalanceTransferCtrl = new BalanceTransferController(app);
        this.get('/balance-transfers', middleware.isLoggedIn('wallet-transfer-list'), BalanceTransferCtrl.INDEX);

        // Federal Reserve Gold Package
        let FederalReserveGoldPackageController = require('../controllers/admins/FederalReserveGoldPackageController');
        let FederalReserveGoldPackageCtrl = new FederalReserveGoldPackageController(app);
        this.get('/federal-reserve-gold-packages', middleware.isLoggedIn('federal-reserve-gold-package-list'), FederalReserveGoldPackageCtrl.INDEX);
        this.post('/federal-reserve-gold-packages/create', FormValidator.create_federal_reserve_gold_package(), middleware.isLoggedIn('federal-reserve-gold-package-create'), FederalReserveGoldPackageCtrl.CREATE);
        this.post('/federal-reserve-gold-packages/:id/update', FormValidator.create_federal_reserve_gold_package(), middleware.isLoggedIn('federal-reserve-gold-package-update'), FederalReserveGoldPackageCtrl.UPDATE);
        this.post('/federal-reserve-gold-packages/:id/upload', middleware.isLoggedIn('federal-reserve-gold-package-create,federal-reserve-gold-package-update'), FederalReserveGoldPackageCtrl.UPLOAD);
        this.get('/federal-reserve-gold-package/history', middleware.isLoggedIn('federal-reserve-gold-package-history-list'), FederalReserveGoldPackageCtrl.PACKAGE_HISTORY);
        this.post('/federal-reserve-gold-package/history/:id/release/:type', middleware.isLoggedIn('federal-reserve-gold-package-release'), FederalReserveGoldPackageCtrl.RELEASE_PACKAGE_EARN);
        this.get('/federal-reserve-gold-package/bonus-history', middleware.isLoggedIn('federal-reserve-gold-package-bonus-history-list'), FederalReserveGoldPackageCtrl.BONUSES_HISTORY);
        this.get('/federal-reserve-gold-package/earn-history', middleware.isLoggedIn('federal-reserve-gold-package-earn-history-list'), FederalReserveGoldPackageCtrl.EARN_HISTORY);

        // Policy Package
        let PolicyPackageController = require('../controllers/admins/PolicyPackageController');
        let PolicyPackageCtrl = new PolicyPackageController(app);
        this.get('/policy-packages', middleware.isLoggedIn('policy-package-list'), PolicyPackageCtrl.INDEX);
        this.post('/policy-packages/:id/upload', PolicyPackageCtrl.UPLOAD);
        this.post('/policy-packages/create', FormValidator.update_policy_package(), middleware.isLoggedIn('policy-package-create'), PolicyPackageCtrl.CREATE);
        this.post('/policy-packages/:id/update', FormValidator.update_policy_package(), middleware.isLoggedIn('policy-package-update'), PolicyPackageCtrl.UPDATE);
        this.get('/policy-package/history', middleware.isLoggedIn('policy-package-history-list'), PolicyPackageCtrl.POLICY_PACKAGE_HISTORY);
        this.get('/policy-package/bonus-history', middleware.isLoggedIn('policy-package-bonus-history-list'), PolicyPackageCtrl.POLICY_PACKAGE_BONUS_HISTORY);
        this.get('/policy-package/earn-history', middleware.isLoggedIn('policy-package-earn-history-list'), PolicyPackageCtrl.POLICY_PACKAGE_EARN_HISTORY);

        // Shanghai Cooperation 
        let ShanghaiCooperationController = require('../controllers/admins/ShanghaiCooperationController');
        let ShanghaiCooperationCtrl = new ShanghaiCooperationController(app);
        this.get('/shanghai-cooperations', middleware.isLoggedIn('shanghai-cooperation-list'), ShanghaiCooperationCtrl.INDEX);
        this.post('/shanghai-cooperations/:id/upload', middleware.isLoggedIn('shanghai-cooperation-create,shanghai-cooperation-update'), ShanghaiCooperationCtrl.UPLOAD);
        this.post('/shanghai-cooperations/create', FormValidator.create_shanghai_cooperation(), middleware.isLoggedIn('shanghai-cooperation-create'), ShanghaiCooperationCtrl.CREATE);
        this.post('/shanghai-cooperations/:id/update', FormValidator.create_shanghai_cooperation(), middleware.isLoggedIn('shanghai-cooperation-update'), ShanghaiCooperationCtrl.UPDATE);
        this.get('/shanghai-cooperations/history', middleware.isLoggedIn('shanghai-cooperation-history-list'), ShanghaiCooperationCtrl.SHANGHAI_COOPERATION_HISTORY);
        this.post('/shanghai-cooperations/history/:id/release/:type', middleware.isLoggedIn('shanghai-cooperation-release'), ShanghaiCooperationCtrl.RELEASE_PACKAGE_EARN);
        this.get('/shanghai-cooperations/bonus-history', middleware.isLoggedIn('shanghai-cooperation-bonus-history-list'), ShanghaiCooperationCtrl.SHANGHAI_COOPERATION_BONUS_HISTORY);
        this.get('/shanghai-cooperations/earn-history', middleware.isLoggedIn('shanghai-cooperation-earn-history-list'), ShanghaiCooperationCtrl.SHANGHAI_COOPERATION_EARN_HISTORY);

        // Gold Appreciation Package
        let GoldAppreciationPackageController = require('../controllers/admins/GoldAppreciationPackageController');
        let GoldAppreciationPackageCtrl = new GoldAppreciationPackageController(app);
        this.get('/gold-appreciation-packages', middleware.isLoggedIn('gold-appreciation-package-list'), GoldAppreciationPackageCtrl.INDEX);
        this.post('/gold-appreciation-packages/create', FormValidator.create_gold_appreciation_package(), middleware.isLoggedIn('gold-appreciation-package-create'), GoldAppreciationPackageCtrl.CREATE);
        this.post('/gold-appreciation-packages/:id/update', FormValidator.create_gold_appreciation_package(), middleware.isLoggedIn('gold-appreciation-package-update'), GoldAppreciationPackageCtrl.UPDATE);
        this.post('/gold-appreciation-packages/:id/upload', middleware.isLoggedIn('gold-appreciation-package-create,gold-appreciation-package-update'), GoldAppreciationPackageCtrl.UPLOAD);
        this.get('/gold-appreciation-packages/history', middleware.isLoggedIn('gold-appreciation-package-history-list'), GoldAppreciationPackageCtrl.PACKAGE_HISTORY);
        this.get('/gold-appreciation-packages/bonus-history', middleware.isLoggedIn('gold-appreciation-package-bonus-history-list'), GoldAppreciationPackageCtrl.BONUSES_HISTORY);
        this.get('/gold-appreciation-packages/earn-history', middleware.isLoggedIn('gold-appreciation-package-earn-history-list'), GoldAppreciationPackageCtrl.EARN_HISTORY);
        this.get('/gold-appreciation-packages/fragment-history', middleware.isLoggedIn('gold-appreciation-package-history-list'), GoldAppreciationPackageCtrl.FRAGMENT_HISTORY);
        
        // Personal Reserve Package
        let PersonalReservePackageController = require('../controllers/admins/PersonalReservePackageController');
        let PersonalReservePackageCtrl = new PersonalReservePackageController(app);
        this.get('/personal-reserve-packages', middleware.isLoggedIn('personal-reserve-package-list'), PersonalReservePackageCtrl.INDEX);
        this.post('/personal-reserve-packages/create', FormValidator.create_personal_reserve_package(), middleware.isLoggedIn('personal-reserve-package-create'), PersonalReservePackageCtrl.CREATE);
        this.post('/personal-reserve-packages/:id/update', FormValidator.create_personal_reserve_package(), middleware.isLoggedIn('personal-reserve-package-update'), PersonalReservePackageCtrl.UPDATE);
        this.post('/personal-reserve-packages/:id/upload', middleware.isLoggedIn('personal-reserve-package-create,personal-reserve-package-update'), PersonalReservePackageCtrl.UPLOAD);
        this.get('/personal-reserve-packages/history', middleware.isLoggedIn('personal-reserve-package-history-list'), PersonalReservePackageCtrl.PACKAGE_HISTORY);
        this.get('/personal-reserve-packages/bonus-history', middleware.isLoggedIn('personal-reserve-package-bonus-history-list'), PersonalReservePackageCtrl.BONUSES_HISTORY);
        this.get('/personal-reserve-packages/earn-history', middleware.isLoggedIn('personal-reserve-package-earn-history-list'), PersonalReservePackageCtrl.EARN_HISTORY);

        // Meeting
        let MeetingController = require('../controllers/admins/MeetingController');
        let MeetingCtrl = new MeetingController(app);
        this.get('/meetings', middleware.isLoggedIn('meeting-list'), MeetingCtrl.INDEX);
        this.post('/meetings/upload', middleware.isLoggedIn('meeting-create,meeting-update'), MeetingCtrl.UPLOAD);
        this.post('/meetings/create', FormValidator.create_meeting(), middleware.isLoggedIn('meeting-create'), MeetingCtrl.CREATE);
        this.post('/meetings/:id/update', FormValidator.create_meeting(), middleware.isLoggedIn('meeting-update'), MeetingCtrl.UPDATE);
        this.post('/meetings/:id/delete', middleware.isLoggedIn('meeting-delete'), MeetingCtrl.DELETE);
        this.get('/meetings/attended-history', middleware.isLoggedIn('meeting-attended-history-list'), MeetingCtrl.ATTENDED_MEETINGS);

        // Authorization Letter
        let AuthorizeLetterController = require('../controllers/admins/AuthorizeLetterController');
        let AuthorizeLetterCtrl = new AuthorizeLetterController(app);
        this.get('/authorization-letters', middleware.isLoggedIn('authorize-letter-list'), AuthorizeLetterCtrl.INDEX);
        this.post('/authorization-letters/:id/upload', middleware.isLoggedIn('authorize-letter-update'), AuthorizeLetterCtrl.UPLOAD);
        this.post('/authorization-letters/:id/update', FormValidator.update_authorization_letter(), middleware.isLoggedIn('authorize-letter-update'), AuthorizeLetterCtrl.UPDATE);
        this.get('/authorization-letters/history', middleware.isLoggedIn('authorize-letter-history-list'), AuthorizeLetterCtrl.HISTORY);

        // Asset Distribution
        let AssetDistributionPackageController = require('../controllers/admins/AssetDistributionPackageController');
        let AssetDistributionPackageCtrl = new AssetDistributionPackageController(app);
        this.get('/asset-distribution-packages', middleware.isLoggedIn('asset-distribution-package-list'), AssetDistributionPackageCtrl.INDEX);
        this.post('/asset-distribution-packages/create', FormValidator.create_asset_distribution_package(), middleware.isLoggedIn('asset-distribution-package-create'), AssetDistributionPackageCtrl.CREATE);
        this.post('/asset-distribution-packages/:id/update', FormValidator.create_asset_distribution_package(), middleware.isLoggedIn('asset-distribution-package-update'), AssetDistributionPackageCtrl.UPDATE);
        this.post('/asset-distribution-packages/:id/upload', middleware.isLoggedIn('asset-distribution-package-create,asset-distribution-package-update'), AssetDistributionPackageCtrl.UPLOAD);
        this.get('/asset-distribution-packages/history', middleware.isLoggedIn('asset-distribution-package-history-list'), AssetDistributionPackageCtrl.ASSET_DISTRIBUTION_PACKAGE_HISTORY);
        this.get('/asset-distribution-packages/bonus-history', middleware.isLoggedIn('asset-distribution-package-bonus-history-list'), AssetDistributionPackageCtrl.ASSET_DISTRIBUTION_PACKAGE_BONUS_HISTORY);
        this.get('/asset-distribution-packages/earn-history', middleware.isLoggedIn('asset-distribution-package-earn-history-list'), AssetDistributionPackageCtrl.ASSET_DISTRIBUTION_PACKAGE_EARN_HISTORY);
        
        // Asset Earn
        let AssetEarnPackageController = require('../controllers/admins/AssetEarnPackageController');
        let AssetEarnPackageCtrl = new AssetEarnPackageController(app);
        this.get('/asset-earn-packages', middleware.isLoggedIn('asset-earn-package-list'), AssetEarnPackageCtrl.INDEX);
        this.post('/asset-earn-packages/create', FormValidator.create_asset_earn_package(), middleware.isLoggedIn('asset-earn-package-create'), AssetEarnPackageCtrl.CREATE);
        this.post('/asset-earn-packages/:id/update', FormValidator.create_asset_earn_package(), middleware.isLoggedIn('asset-earn-package-update'), AssetEarnPackageCtrl.UPDATE);
        this.post('/asset-earn-packages/:id/upload', middleware.isLoggedIn('asset-earn-package-create,asset-earn-package-update'), AssetEarnPackageCtrl.UPLOAD);
        this.get('/asset-earn-packages/history', middleware.isLoggedIn('asset-earn-package-history-list'), AssetEarnPackageCtrl.ASSET_EARN_PACKAGE_HISTORY);
        this.get('/asset-earn-packages/bonus-history', middleware.isLoggedIn('asset-earn-package-bonus-history-list'), AssetEarnPackageCtrl.ASSET_EARN_PACKAGE_BONUS_HISTORY);
        this.get('/asset-earn-packages/earn-history', middleware.isLoggedIn('asset-earn-package-earn-history-list'), AssetEarnPackageCtrl.ASSET_EARN_PACKAGE_EARN_HISTORY);
    }
}

module.exports = AdminRoute