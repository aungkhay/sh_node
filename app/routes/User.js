const express = require('express');

class UserRoute extends express.Router {
    constructor(app) {
        super();

        let FormValidator = require('../helpers/FormValidator.User');
        let Middleware = require('../middlewares/UserMiddleware');
        let middleware = new Middleware(app);

        let AuthController = require('../controllers/users/AuthController');
        let AuthCtrl = new AuthController(app);
        this.get('/get-recaptcha', AuthCtrl.GET_RECAPTCHA);
        this.post('/register', FormValidator.register(), AuthCtrl.REGISTER);
        this.post('/login', FormValidator.login(), AuthCtrl.LOGIN);
        this.get('/profile', middleware.isLoggedIn, AuthCtrl.PROFILE);
        this.post('/logout', middleware.isLoggedIn, AuthCtrl.LOGOUT);
        this.post('/modify-password', FormValidator.modify_password(), middleware.isLoggedIn, AuthCtrl.MODIFY_PASSWORD);
        this.post('/forgot-password', FormValidator.forgot_password(), AuthCtrl.FORGOT_PASSWORD);

        let HomeController = require('../controllers/users/HomeController');
        const HomeCtrl = new HomeController(app);
        this.get('/get-server-time', HomeCtrl.GET_SERVER_TIME);
        this.get('/get-file-path', middleware.isLoggedIn, HomeCtrl.GET_FILE_PATH);
        this.get('/customer-service/:type', HomeCtrl.GET_CUSTOMER_SERVICE);
        this.get('/notifications', middleware.isLoggedIn, HomeCtrl.NOTIFICATIONS);
        this.get('/notifications/:id/details', middleware.isLoggedIn, HomeCtrl.NOTIFICATION_DETAIL);
        this.post('/notifications/:id/mark-read', middleware.isLoggedIn, HomeCtrl.MARK_NOTIFICATION_READ);
        this.get('/news', middleware.isLoggedIn, HomeCtrl.GET_NEWS);
        this.post('/news/upload', middleware.isLoggedIn, HomeCtrl.UPLOAD_NEWS_PIC);
        this.post('/news/post', FormValidator.post_news(), middleware.isLoggedIn, HomeCtrl.POST_NEWS);
        this.get('/news/:id/details', middleware.isLoggedIn, HomeCtrl.NEWS_DETAILS);
        this.post('/news/:id/like', middleware.isLoggedIn, HomeCtrl.LIKE_NEWS);
        this.post('/news/:id/report', FormValidator.report_news(), middleware.isLoggedIn, HomeCtrl.REPORT_NEWS);
        this.get('/certificates', middleware.isLoggedIn, HomeCtrl.CERTIFICATES);
        this.get('/my-certificates', middleware.isLoggedIn, HomeCtrl.MY_CERTIFICATES);
        this.post('/certificates/:id/pick', middleware.isLoggedIn, HomeCtrl.PICK_CERTIFICATE);
        this.post('/certificates/:id/use', middleware.isLoggedIn, HomeCtrl.USE_CERTIFICATE);
        this.get('/informations', middleware.isLoggedIn, HomeCtrl.INFORMATION_LIST);
        this.get('/get-digital-aggrement', middleware.isLoggedIn, HomeCtrl.GET_DIGITAL_AGREEMENT);
        this.post('/sign-agreement', middleware.isLoggedIn, HomeCtrl.SIGN_AGREEMENT);
        this.get('/get-welcome-message', middleware.isLoggedIn, HomeCtrl.GET_WELCOME_MESSAGE);
        this.get('/generate-red-envelop', middleware.isLoggedIn, HomeCtrl.GENERATE_RED_ENVELOP);
        this.get('/get-red-envelop', middleware.isLoggedIn, HomeCtrl.GET_RED_ENVELOP);
        this.get('/ranks', middleware.isLoggedIn, HomeCtrl.RANKS);
        this.post('/request-next-rank', middleware.isLoggedIn, HomeCtrl.REQUEST_NEXT_RANK);
        this.get('/downline-child-3-level', middleware.isLoggedIn, HomeCtrl.DOWNLINE_CHILD_3_LEVEL);
        this.post('/impeach-child', FormValidator.impeach_child(), middleware.isLoggedIn, HomeCtrl.IMPEACH_CHILD);
        this.get('/impeach-history', middleware.isLoggedIn, HomeCtrl.IMPEACH_HISTORY);
        this.get('/allowance-history', middleware.isLoggedIn, HomeCtrl.ALLOWANCE_HISTORY);
        this.get('/ticket-list', middleware.isLoggedIn, HomeCtrl.TICKET_LIST);
        this.post('/allowances/:id/exchange', middleware.isLoggedIn, HomeCtrl.EXCHANGE_ALLOWANCE);
        this.get('/exchange-history', middleware.isLoggedIn, HomeCtrl.EXCHANGE_HISTORY);
        this.post('/inherit-owner', FormValidator.inherit_owner(), middleware.isLoggedIn, HomeCtrl.INHERIT_OWNER);
        this.post('/upload-inheritance-prove', middleware.isLoggedIn, HomeCtrl.UPLOAD_INHERITANCE_PROVE);
        this.get('/earn-summary', middleware.isLoggedIn, HomeCtrl.EARN_SUMMARY);
        this.get('/earn-history', middleware.isLoggedIn, HomeCtrl.EARN_HISTORY);
        this.get('/masonic-fund', middleware.isLoggedIn, HomeCtrl.MASONIC_FUND);
        this.post('/get-masonic-fund', middleware.isLoggedIn, HomeCtrl.GET_MASONIC_FUND);
        this.get('/get-banners', HomeCtrl.GET_BANNER);
        this.get('/get-gold-prices', middleware.isLoggedIn, HomeCtrl.GOLD_PRICE);
        this.post('/buy-gold', FormValidator.buy_gold(), middleware.isLoggedIn, HomeCtrl.BUY_GOLD);
        this.post('/sell-gold', FormValidator.buy_gold(), middleware.isLoggedIn, HomeCtrl.SELL_GOLD);
        this.get('/buy-sell-gold-history', middleware.isLoggedIn, HomeCtrl.BUY_SELL_GOLD_HISTORY);
        this.get('/superior-internal-account', middleware.isLoggedIn, HomeCtrl.SUPERIOR_INTERNAL_ACCOUNT);
        this.get('/gold-summary', middleware.isLoggedIn, HomeCtrl.GOLD_SUMMARY);
        this.post('/gold-coupon/:id/exchange-to-gold', middleware.isLoggedIn, HomeCtrl.EXCHANGE_GOLD_BY_GOLD_COUPON);
        this.post('/gold-coupon/:id/exchange-to-balance', middleware.isLoggedIn, HomeCtrl.EXCHANGE_BALANCE_BY_GOLD_COUPON);
        this.get('/gold-coupon/history', middleware.isLoggedIn, HomeCtrl.GOLD_COUPON_HISTORY);
        this.get('/gold-interest-history', middleware.isLoggedIn, HomeCtrl.GOLD_INTEREST_HISTORY);
        this.post('/redempt-code', FormValidator.redempt_code(), middleware.isLoggedIn, HomeCtrl.GET_REDEMPTION_CODE);
        this.get('/reward-history', middleware.isLoggedIn, HomeCtrl.REWARD_HISTORY);

        let UserController = require('../controllers/users/UserController');
        const UserCtrl = new UserController(app);
        this.post('/kyc/verify', FormValidator.verify_kyc(), middleware.isLoggedIn, UserCtrl.VERIFY_KYC);
        this.post('/kyc/get-kyc-sign-url', FormValidator.get_kyc_sign_url(), middleware.isLoggedIn, UserCtrl.GET_KYC_SIGN_URL);
        this.post('/kyc/:type/upload', middleware.isLoggedIn, UserCtrl.UPLOAD_KYC);
        this.get('/kyc/info', middleware.isLoggedIn, UserCtrl.KYC_INFO);
        // this.post('/payment-method/bind', FormValidator.bind_payment_method(), middleware.isLoggedIn, UserCtrl.BIND_PAYMENT_METHOD);
        this.post('/payment-method/:type/upload', middleware.isLoggedIn, UserCtrl.UPLOAD_PAYMENT_METHOD);
        this.post('/payment-method/bind-bank', FormValidator.bind_bank(), middleware.isLoggedIn, UserCtrl.BIND_BANK);
        this.post('/payment-method/bind-alipay', FormValidator.bind_alipay(), middleware.isLoggedIn, UserCtrl.BIND_ALIPAY);
        this.get('/payment-method/info', middleware.isLoggedIn, UserCtrl.PAYMENT_METHOD_INFO);
        this.post('/bind-address', FormValidator.bind_address(), middleware.isLoggedIn, UserCtrl.BIND_ADDRESS);
        this.post('/upload-profile-picture', middleware.isLoggedIn, UserCtrl.UPLOAD_PROFILE_PICTURE);
        this.get('/teams', middleware.isLoggedIn, UserCtrl.TEAM);

        let TransactionController = require('../controllers/users/TransactionController');
        let TxnCtl = new TransactionController(app);
        this.post('/recharge-callback', TxnCtl.RECHARGE_CALLBACK);
        this.post('/deposit', FormValidator.deposit(), middleware.isLoggedIn, TxnCtl.DEPOSIT);
        this.get('/deposit-history', middleware.isLoggedIn, TxnCtl.DEPOSIT_HISTORY);
        this.post('/withdraw', FormValidator.withdraw(), middleware.isLoggedIn, TxnCtl.WITHDRAW);
        this.get('/withdraw-history', middleware.isLoggedIn, TxnCtl.WITHDRAW_HISTORY);
        this.post('/transfer-balance-to-reserve-fund', FormValidator.transfer(), middleware.isLoggedIn, TxnCtl.TRANSFER_BALANCE_TO_RESERVE_FUND);
        // this.post('/transfer-referral-bonus-to-balance', FormValidator.transfer(), middleware.isLoggedIn, TxnCtl.TRANSFER_REFERRAL_BONUS_TO_BALANCE);
        this.get('/referral-bonus-coupons', middleware.isLoggedIn, TxnCtl.REFERRAL_BONUS_COUPONS);
        this.post('/transfer-referral-bonus-to-balance-by-coupon/:id', middleware.isLoggedIn, TxnCtl.TRANSFER_REFERRAL_BONUS_TO_BALANCE_BY_COUPON);
        // this.post('/transfer-referral-bonus-to-reserve-fund', FormValidator.transfer(), middleware.isLoggedIn, TxnCtl.TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND);
        this.post('/transfer-referral-bonus-to-reserve-fund-by-coupon/:id', middleware.isLoggedIn, TxnCtl.TRANSFER_REFERRAL_BONUS_TO_RESERVE_FUND_BY_COUPON);
        this.post('/transfer-allowance-to-balance', FormValidator.transfer(), middleware.isLoggedIn, TxnCtl.TRANSFER_ALLOWANCE_TO_BALANCE);
        this.post('/transfer-balance-to-earn', FormValidator.transfer(), middleware.isLoggedIn, TxnCtl.TRANSFER_BALANCE_TO_EARN);
        this.post('/transfer-earn-to-balance', FormValidator.transfer(), middleware.isLoggedIn, TxnCtl.TRANSFER_EARN_TO_BALANCE);
        this.post('/transfer-gold-interest-to-balance', FormValidator.transfer(), middleware.isLoggedIn, TxnCtl.TRANSFER_GOLD_INTEREST_TO_BALANCE);
    }
}

module.exports = UserRoute