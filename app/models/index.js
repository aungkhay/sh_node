// models/index.js
const db = require('../connections/Mysql');

const Config = require('./Config');
const Rank = require('./Rank');
const User = require('./User');
const Allowance = require('./Allowance');
const Impeachment = require('./Impeachment');
const PaymentMethod = require('./PaymentMethod');
const UserKYC = require('./UserKYC');
const News = require('./News');
const Certificate = require('./Certificate');
const UserCertificate = require('./UserCertificate');
const Information = require('./Information');
const Notification = require('./Notification');
const ReadNotification = require('./ReadNotification');
const SpecificUserNotification = require('./SpecificUserNotification');
const RewardType = require('./RewardType');
const RewardRecord = require('./RewardRecord');
const Ticket = require('./Ticket');
const TicketRecord = require('./TicketRecord');
const InheritOwner = require('./InheritOwner');
const DepositMerchant = require('./DepositMerchant');
const Deposit = require('./Deposit');
const Withdraw = require('./Withdraw');
const Transfer = require('./Transfer');
const Interest = require('./Interest');
const MasonicFund = require('./MasonicFund');
const MasonicFundHistory = require('./MasonicFundHistory');
const TempMasonicFundHistory = require('./TempMasonicFundHistory');
const AdminLog = require('./AdminLog');
const UserBonus = require('./UserBonus');
const UserRankPoint = require('./UserRankPoint');
const GoldPrice = require('./GoldPrice');
const UserGoldPrice = require('./UserGoldPrice');
const Banner = require('./Banner');
const UserLog = require('./UserLog');
const GoldInterest = require('./GoldInterest');
const NewsLikes = require('./NewsLikes');
const NewsReports = require('./NewsReports');
const RankHistory = require('./RankHistory')
const RedemptCode = require('./RedemptCode');

// ========== USER ↔️ USER (1:1) ==========
User.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' });
User.belongsTo(User, { foreignKey: 'top_account_id', as: 'top_account' });

// ========== RANK ↔️ USER (1:1) ==========
Rank.hasMany(User, { foreignKey: 'rank_id', as: 'users' });
Rank.hasMany(Allowance, { foreignKey: 'rank_id', as: 'allowances' });
User.belongsTo(Rank, { foreignKey: 'rank_id', as: 'rank' });
Allowance.belongsTo(Rank, { foreignKey: 'rank_id', as: 'rank' });
Allowance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ========== RANK ↔️ USER (1:N) ==========
Rank.hasMany(RankHistory, { foreignKey: 'rank_id', as: 'rank_histories' });
User.hasMany(RankHistory, { foreignKey: 'user_id', as: 'rank_histories' });
RankHistory.belongsTo(Rank, { foreignKey: 'rank_id', as: 'rank' });
RankHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ========== USER ↔️ IMPEACHMENT (1:1) ==========
User.hasMany(Impeachment, { foreignKey: 'parent_id', as: 'parent_impeachments', onDelete: 'CASCADE' });
User.hasMany(Impeachment, { foreignKey: 'child_id', as: 'child_impeachments', onDelete: 'CASCADE' });
Impeachment.belongsTo(User, { foreignKey: 'parent_id', as: 'parent', onDelete: 'CASCADE' });
Impeachment.belongsTo(User, { foreignKey: 'child_id', as: 'child', onDelete: 'CASCADE' });

// ========== USER ↔️ KYC (1:1) ==========
User.hasOne(UserKYC, { foreignKey: 'user_id', as: 'kyc', onDelete: 'CASCADE' });
UserKYC.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ PAYMENT_METHOD (1:1) ==========
User.hasOne(PaymentMethod, { foreignKey: 'user_id', as: 'payment_method', onDelete: 'CASCADE' });
PaymentMethod.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ CERTIFICATE (1:N) ==========
User.hasMany(UserCertificate, { foreignKey: 'user_id', as: 'certificates', onDelete: 'CASCADE' });
Certificate.hasMany(UserCertificate, { foreignKey: 'certificate_id', as: 'user_certificates', onDelete: 'CASCADE' });
UserCertificate.belongsTo(Certificate, { foreignKey: 'certificate_id', as: 'certificate', onDelete: 'CASCADE' });
UserCertificate.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ NOTIFICATION (1:N) ==========
Notification.hasMany(ReadNotification, { foreignKey: 'notification_id', as: 'read_notifications', onDelete: 'CASCADE' });
ReadNotification.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification', onDelete: 'CASCADE' });

Notification.hasMany(SpecificUserNotification, { foreignKey: 'notification_id', as: 'specific_notifications', onDelete: 'CASCADE' });
SpecificUserNotification.belongsTo(Notification, { foreignKey: 'notification_id', as: 'notification', onDelete: 'CASCADE' });

// ========== USER ↔️ REWARD_RECORD (1:N) ==========
User.hasMany(RewardRecord, { foreignKey: 'user_id', as: 'reward_records', onDelete: 'CASCADE' });
RewardRecord.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
RewardType.hasMany(RewardRecord, { foreignKey: 'reward_id', as: 'reward_records' });
RewardRecord.belongsTo(RewardType, { foreignKey: 'reward_id', as: 'reward_type' });

// ========== USER ↔️ TICKET (1:N) ==========
User.hasMany(TicketRecord, { foreignKey: 'user_id', as: 'tickets', onDelete: 'CASCADE' });
Ticket.hasMany(TicketRecord, { foreignKey: 'ticket_id', as: 'tickets', onDelete: 'CASCADE' })
TicketRecord.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
TicketRecord.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket', onDelete: 'CASCADE' });

// ========== USER ↔️ INHERIT_OWNER (1:N) ==========
User.hasOne(InheritOwner, { foreignKey: 'user_id', as: 'inherit', onDelete: 'CASCADE' });
InheritOwner.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ DEPOSIT (1:N) ==========
User.hasMany(Deposit, { foreignKey: 'user_id', as: 'deposits', onDelete: 'CASCADE' });
Deposit.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========= DEPOSIT_MERCHANT ↔️ DEPOSIT (1:N) ==========
DepositMerchant.hasMany(Deposit, { foreignKey: 'deposit_merchant_id', as: 'deposits', onDelete: 'CASCADE' });
Deposit.belongsTo(DepositMerchant, { foreignKey: 'deposit_merchant_id', as: 'deposit_merchant', onDelete: 'CASCADE' });

// ========== USER ↔️ WITHDRAW (1:N) ==========
User.hasMany(Withdraw, { foreignKey: 'user_id', as: 'withdraws', onDelete: 'CASCADE' });
Withdraw.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ TRANSFER (1:N) ==========
User.hasMany(Transfer, { foreignKey: 'user_id', as: 'transfers', onDelete: 'CASCADE' });
Transfer.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ INTEREST (1:N) ==========
User.hasMany(Interest, { foreignKey: 'user_id', as: 'interests', onDelete: 'CASCADE' });
Interest.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ GOLD_INTEREST (1:N) ==========
User.hasMany(GoldInterest, { foreignKey: 'user_id', as: 'gold_interests', onDelete: 'CASCADE' });
GoldInterest.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ MasonicFundHistory (1:N) ==========
User.hasMany(MasonicFundHistory, { foreignKey: 'user_id', as: 'funds', onDelete: 'CASCADE' });
MasonicFundHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ ADMIN_LOG (1:N) ==========
User.hasMany(AdminLog, { foreignKey: 'admin_id', as: 'logs', onDelete: 'CASCADE' });
AdminLog.belongsTo(User, { foreignKey: 'admin_id', as: 'admin', onDelete: 'CASCADE' });

// ========== USER ↔️ BONUS (1:N) ==========
User.hasMany(UserBonus, { foreignKey: 'user_id', as: 'bonuses', onDelete: 'CASCADE' });
UserBonus.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
UserBonus.belongsTo(User, { foreignKey: 'from_user_id', as: 'from_user', onDelete: 'CASCADE' });

// ========== USER ↔️ RANK_POINT (1:N) ==========
User.hasMany(UserRankPoint, { foreignKey: 'from', as: 'from_points', onDelete: 'CASCADE' });
User.hasMany(UserRankPoint, { foreignKey: 'to', as: 'to_points', onDelete: 'CASCADE' });
UserRankPoint.belongsTo(User, { foreignKey: 'from', as: 'from_user', onDelete: 'CASCADE' });
UserRankPoint.belongsTo(User, { foreignKey: 'to', as: 'to_user', onDelete: 'CASCADE' });

// ========== USER ↔️ USER_GOLD_PRICE (1:N) ==========
User.hasMany(UserGoldPrice, { foreignKey: 'user_id', as: 'gold_prices', onDelete: 'CASCADE' });
UserGoldPrice.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ USER_LOG (1:N) ==========
User.hasMany(UserLog, { foreignKey: 'user_id', as: 'userlogs', onDelete: 'CASCADE' });
UserLog.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ NEWS (1:N) ==========
// User -> News
User.hasMany(News, { foreignKey: 'user_id', as: 'news', onDelete: 'CASCADE' });
News.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
// News -> NewsLikes
News.hasMany(NewsLikes, { foreignKey: 'news_id', as: 'likes', onDelete: 'CASCADE', hooks: true });
NewsLikes.belongsTo(News, { foreignKey: 'news_id', as: 'news', onDelete: 'CASCADE' });
// User -> NewsLikes
User.hasMany(NewsLikes, { foreignKey: 'user_id', as: 'liked_news', onDelete: 'CASCADE', hooks: true });
NewsLikes.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
// News -> NewsReports
News.hasMany(NewsReports, { foreignKey: 'news_id', as: 'reports', onDelete: 'CASCADE', hooks: true });
NewsReports.belongsTo(News, { foreignKey: 'news_id', as: 'news', onDelete: 'CASCADE' });
// User -> NewsReports
User.hasMany(NewsReports, { foreignKey: 'user_id', as: 'reported_news', onDelete: 'CASCADE', hooks: true });
NewsReports.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ REDEMPT_CODE (1:N) ==========
User.hasMany(RedemptCode, { foreignKey: 'user_id', as: 'redempt_codes', onDelete: 'CASCADE' });
RedemptCode.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

const models = {
    Config,
    Rank,
    User,
    Impeachment,
    Allowance,
    UserKYC,
    PaymentMethod,
    News,
    Notification,
    Certificate,
    UserCertificate,
    Information,
    ReadNotification,
    SpecificUserNotification,
    RewardType,
    RewardRecord,
    Ticket,
    TicketRecord,
    InheritOwner,
    DepositMerchant,
    Deposit,
    Withdraw,
    Transfer,
    Interest,
    MasonicFund,
    MasonicFundHistory,
    TempMasonicFundHistory,
    AdminLog,
    UserBonus,
    UserRankPoint,
    GoldPrice,
    UserGoldPrice,
    Banner,
    UserLog,
    GoldInterest,
    NewsLikes,
    RedemptCode,
};

// Export models + db connection
module.exports = {
    ...models,
    db,
    connect: async () => {
        try {
            await db.authenticate();
            console.log('\x1b[32m[DB]\x1b[0m', 'Connection has been established successfully.');
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }
    },
    syncDB: async () => {
        try {
            await db.sync(); // use { force: true } to drop & recreate tables
            console.log('\x1b[36m[DB]\x1b[0m Tables synchronized successfully.');
        } catch (err) {
            console.error('Error synchronizing database:', err);
        }
    }
};