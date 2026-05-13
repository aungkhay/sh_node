// models/index.js
const db = require('../connections/Mysql');

const Role = require('./Role');
const Permission = require('./Permission');
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
const MerchantChannel = require('./MerchantChannel');
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
const UserSpringFestivalCheckIn = require('./UserSpringFestivalCheckIn');
const UserSpringFestivalCheckInLog = require('./UserSpringFestivalCheckInLog');
const SpringWhiteList = require('./SpringWhiteList');
const GoldPackageHistory = require('./GoldPackageHistory');
const GoldPackageBonuses = require('./GoldPackageBonuses');
const GoldPackageReturn = require('./GoldPackageReturn');
const GoldPackageRepurchase = require('./GoldPackageRepurchase');
const GoldPlanCheckIn = require('./GoldPlanCheckIn');
const BalanceTransfer = require('./BalanceTransfer');
const MasonicPackage = require('./MasonicPackage');
const MasonicPackageHistory = require('./MasonicPackageHistory');
const MasonicPackageBonuses = require('./MasonicPackageBonuses');
const MasonicPackageEarn = require('./MasonicPackageEarn');
const GoldCouponTemp = require('./GoldCouponTemp');
const FederalReserveGoldPackage = require('./FederalReserveGoldPackage');
const FederalReserveGoldPackageHistory = require('./FederalReserveGoldPackageHistory');
const FederalReserveGoldPackageBonuses = require('./FederalReserveGoldPackageBonuses');
const FederalReserveGoldPackageEarn = require('./FederalReserveGoldPackageEarn');
const PolicyPackage = require('./PolicyPackage');
const PolicyPackageHistory = require('./PolicyPackageHistory');
const PolicyPackageBonuses = require('./PolicyPackageBonuses');
const PolicyPackageEarn = require('./PolicyPackageEarn');
const CashFlow = require('./CashFlow');
const Meeting = require('./Meeting');
const AttendedMeeting = require('./AttendedMeeting');

// ========== Role ↔️ Permission ========== 
Role.belongsToMany(Permission, { as: 'permissions', through: 'role_has_permissions', foreignKey: 'RoleId' });
Permission.belongsToMany(Role, { through: 'role_has_permissions', foreignKey: 'PermissionId' });

// Admin ↔️ Role
User.belongsToMany(Role, { as: 'roles', through: 'admin_has_roles', foreignKey: 'AdminId' });
Role.belongsToMany(User, { through: 'admin_has_roles', foreignKey: 'RoleId' });

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
MerchantChannel.belongsTo(DepositMerchant, { foreignKey: 'deposit_merchant_id', as: 'deposit_merchant', onDelete: 'CASCADE' });
DepositMerchant.hasMany(MerchantChannel, { foreignKey: 'deposit_merchant_id', as: 'channels', onDelete: 'CASCADE' });

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

// ========= USER ↔️ SPRING_FESTIVAL_CHECK_IN (1:N) ==========
User.hasOne(UserSpringFestivalCheckIn, { foreignKey: 'user_id', as: 'spring_festival_checks', onDelete: 'CASCADE' });
UserSpringFestivalCheckIn.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ======== USER ↔️ SPRING_FESTIVAL_CHECK_IN_LOG (1:N) ==========
User.hasMany(UserSpringFestivalCheckInLog, { foreignKey: 'user_id', as: 'spring_festival_checkin_logs', onDelete: 'CASCADE' });
UserSpringFestivalCheckInLog.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ======== USER ↔️ SPRING_WHITE_LIST ==========
User.hasOne(SpringWhiteList, { foreignKey: 'user_id', as: 'spring_white_list', onDelete: 'CASCADE' });
SpringWhiteList.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ GOLD_PACKAGE_HISTORY (1:N) ==========
User.hasMany(GoldPackageHistory, { foreignKey: 'user_id', as: 'gold_package_histories', onDelete: 'CASCADE' });
GoldPackageHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ GOLD_PACKAGE_BONUSES (1:N) ==========
User.hasMany(GoldPackageBonuses, { foreignKey: 'user_id', as: 'gold_package_bonuses', onDelete: 'CASCADE' });
GoldPackageBonuses.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
GoldPackageBonuses.belongsTo(User, { foreignKey: 'from_user_id', as: 'from_user', onDelete: 'CASCADE' });

// ========== USER ↔️ GOLD_PACKAGE_RETURN (1:N) ==========
User.hasMany(GoldPackageReturn, { foreignKey: 'user_id', as: 'gold_package_returns', onDelete: 'CASCADE' });
GoldPackageReturn.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
GoldPackageReturn.belongsTo(GoldPackageHistory, { foreignKey: 'package_history_id', as: 'package_history', onDelete: 'CASCADE' });

// ========= USER ↔️ GOLD_PACKAGE_REPURCHASE (1:N) ==========
User.hasMany(GoldPackageRepurchase, { foreignKey: 'user_id', as: 'gold_package_repurchase', onDelete: 'CASCADE' });
GoldPackageRepurchase.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========= USER ↔️ GOLD_PLAN_CHECK_IN (1:N) ==========
User.hasMany(GoldPlanCheckIn, { foreignKey: 'user_id', as: 'gold_plan_check_ins', onDelete: 'CASCADE' });
GoldPlanCheckIn.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ BALANCE_TRANSFER (1:N) ==========
User.hasMany(BalanceTransfer, { foreignKey: 'from_user', as: 'sent_transfers', onDelete: 'CASCADE' });
BalanceTransfer.belongsTo(User, { foreignKey: 'from_user', as: 'from', onDelete: 'CASCADE' });
User.hasMany(BalanceTransfer, { foreignKey: 'to_user', as: 'received_transfers', onDelete: 'CASCADE' });
BalanceTransfer.belongsTo(User, { foreignKey: 'to_user', as: 'to', onDelete: 'CASCADE' });

// ========== USER ↔️ MASONIC_PACKAGE_HISTORY (1:N) ==========
User.hasMany(MasonicPackageHistory, { foreignKey: 'user_id', as: 'masonic_package_histories', onDelete: 'CASCADE' });
MasonicPackageHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ======== MASONIC_PACKAGE ↔️ MASONIC_PACKAGE_HISTORY (1:N) ==========
MasonicPackage.hasMany(MasonicPackageHistory, { foreignKey: 'package_id', as: 'histories', onDelete: 'CASCADE' });
MasonicPackageHistory.belongsTo(MasonicPackage, { foreignKey: 'package_id', as: 'package', onDelete: 'CASCADE' });

// ========== USER ↔️ MASONIC_PACKAGE_BONUSES (1:N) ==========
User.hasMany(MasonicPackageBonuses, { foreignKey: 'user_id', as: 'masonic_package_bonuses', onDelete: 'CASCADE' });
MasonicPackageBonuses.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
MasonicPackageBonuses.belongsTo(User, { foreignKey: 'from_user_id', as: 'from_user', onDelete: 'CASCADE' });

// ========== MASONIC_PACKAGE_HISTORY ↔️ MASONIC_PACKAGE_BONUSES (1:N) ==========
MasonicPackageHistory.hasMany(MasonicPackageBonuses, { foreignKey: 'package_history_id', as: 'bonuses', onDelete: 'CASCADE' });
MasonicPackageBonuses.belongsTo(MasonicPackageHistory, { foreignKey: 'package_history_id', as: 'package_history', onDelete: 'CASCADE' });

// ========== USER ↔️ MASONIC_PACKAGE_EARN (1:N) ==========
User.hasMany(MasonicPackageEarn, { foreignKey: 'user_id', as: 'masonic_package_earn', onDelete: 'CASCADE' });
MasonicPackageEarn.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== MASONIC_PACKAGE_HISTORY ↔️ MASONIC_PACKAGE_EARN (1:N) ==========
MasonicPackageHistory.hasMany(MasonicPackageEarn, { foreignKey: 'package_history_id', as: 'earns', onDelete: 'CASCADE' });
MasonicPackageEarn.belongsTo(MasonicPackageHistory, { foreignKey: 'package_history_id', as: 'package_history', onDelete: 'CASCADE' });

// ========== MASONIC_PACKAGE ↔️ MASONIC_PACKAGE_EARN (1:N) ==========
MasonicPackage.hasMany(MasonicPackageEarn, { foreignKey: 'package_id', as: 'earns', onDelete: 'CASCADE' });
MasonicPackageEarn.belongsTo(MasonicPackage, { foreignKey: 'package_id', as: 'package', onDelete: 'CASCADE' });

// ========== GoldCouponTemp ↔️ User (1:N) ==========
User.hasMany(GoldCouponTemp, { foreignKey: 'user_id', as: 'gold_coupon_temps', onDelete: 'CASCADE' });
GoldCouponTemp.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== FEDERAL_RESERVE_GOLD_PACKAGE ↔️ FEDERAL_RESERVE_GOLD_PACKAGE_HISTORY (1:N) ==========
FederalReserveGoldPackage.hasMany(FederalReserveGoldPackageHistory, { foreignKey: 'package_id', as: 'histories', onDelete: 'CASCADE' });
FederalReserveGoldPackageHistory.belongsTo(FederalReserveGoldPackage, { foreignKey: 'package_id', as: 'package', onDelete: 'CASCADE' });

// ========== USER ↔️ FEDERAL_RESERVE_GOLD_PACKAGE_HISTORY (1:N) ==========
User.hasMany(FederalReserveGoldPackageHistory, { foreignKey: 'user_id', as: 'federal_reserve_gold_package_histories', onDelete: 'CASCADE' });
FederalReserveGoldPackageHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== USER ↔️ FEDERAL_RESERVE_GOLD_PACKAGE_BONUSES (1:N) ==========
User.hasMany(FederalReserveGoldPackageBonuses, { foreignKey: 'user_id', as: 'federal_reserve_gold_package_bonuses', onDelete: 'CASCADE' });
FederalReserveGoldPackageBonuses.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
FederalReserveGoldPackageBonuses.belongsTo(User, { foreignKey: 'from_user_id', as: 'from_user', onDelete: 'CASCADE' });

// ========== FEDERAL_RESERVE_GOLD_PACKAGE_HISTORY ↔️ FEDERAL_RESERVE_GOLD_PACKAGE_BONUSES (1:N) ==========
FederalReserveGoldPackageHistory.hasMany(FederalReserveGoldPackageBonuses, { foreignKey: 'package_history_id', as: 'bonuses', onDelete: 'CASCADE' });
FederalReserveGoldPackageBonuses.belongsTo(FederalReserveGoldPackageHistory, { foreignKey: 'package_history_id', as: 'package_history', onDelete: 'CASCADE' });

// ========== USER ↔️ FEDERAL_RESERVE_GOLD_PACKAGE_EARN (1:N) ==========
User.hasMany(FederalReserveGoldPackageEarn, { foreignKey: 'user_id', as: 'federal_reserve_gold_package_earn', onDelete: 'CASCADE' });
FederalReserveGoldPackageEarn.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== FEDERAL_RESERVE_GOLD_PACKAGE_HISTORY ↔️ FEDERAL_RESERVE_GOLD_PACKAGE_EARN (1:N) ==========
FederalReserveGoldPackageHistory.hasMany(FederalReserveGoldPackageEarn, { foreignKey: 'package_history_id', as: 'earns', onDelete: 'CASCADE' });
FederalReserveGoldPackageEarn.belongsTo(FederalReserveGoldPackageHistory, { foreignKey: 'package_history_id', as: 'package_history', onDelete: 'CASCADE' });

// ========== FEDERAL_RESERVE_GOLD_PACKAGE ↔️ FEDERAL_RESERVE_GOLD_PACKAGE_EARN (1:N) ==========
FederalReserveGoldPackage.hasMany(FederalReserveGoldPackageEarn, { foreignKey: 'package_id', as: 'earns', onDelete: 'CASCADE' });
FederalReserveGoldPackageEarn.belongsTo(FederalReserveGoldPackage, { foreignKey: 'package_id', as: 'package', onDelete: 'CASCADE' });

// ========== USER ↔️ POLICY_PACKAGE_HISTORY (1:N) ==========
User.hasMany(PolicyPackageHistory, { foreignKey: 'user_id', as: 'policy_package_histories', onDelete: 'CASCADE' });
PolicyPackageHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== POLICY_PACKAGE_HISTORY ↔️ POLICY_PACKAGE_BONUSES (1:N) ==========
PolicyPackageHistory.hasMany(PolicyPackageBonuses, { foreignKey: 'package_history_id', as: 'bonuses', onDelete: 'CASCADE' });
PolicyPackageBonuses.belongsTo(PolicyPackageHistory, { foreignKey: 'package_history_id', as: 'package_history', onDelete: 'CASCADE' });

// ========== POLICY_PACKAGE_HISTORY ↔️ POLICY_PACKAGE_EARN (1:N) ==========
PolicyPackageHistory.hasMany(PolicyPackageEarn, { foreignKey: 'package_history_id', as: 'earns', onDelete: 'CASCADE' });
PolicyPackageEarn.belongsTo(PolicyPackageHistory, { foreignKey: 'package_history_id', as: 'package_history', onDelete: 'CASCADE' });

// ========== POLICY_PACKAGE ↔️ POLICY_PACKAGE_EARN (1:N) ==========
PolicyPackage.hasMany(PolicyPackageEarn, { foreignKey: 'package_id', as: 'earns', onDelete: 'CASCADE' });
PolicyPackageEarn.belongsTo(PolicyPackage, { foreignKey: 'package_id', as: 'package', onDelete: 'CASCADE' });

// ========== POLICY_PACKAGE ↔️ POLICY_PACKAGE_HISTORY (1:N) ==========
PolicyPackage.hasMany(PolicyPackageHistory, { foreignKey: 'package_id', as: 'histories', onDelete: 'CASCADE' });
PolicyPackageHistory.belongsTo(PolicyPackage, { foreignKey: 'package_id', as: 'package', onDelete: 'CASCADE' });

// ========== USER ↔️ POLICY_PACKAGE_BONUSES (1:N) ==========
User.hasMany(PolicyPackageBonuses, { foreignKey: 'user_id', as: 'policy_package_bonuses', onDelete: 'CASCADE' });
PolicyPackageBonuses.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
PolicyPackageBonuses.belongsTo(User, { foreignKey: 'from_user_id', as: 'from_user', onDelete: 'CASCADE' });

// ========== USER ↔️ POLICY_PACKAGE_EARN (1:N) ==========
User.hasMany(PolicyPackageEarn, { foreignKey: 'user_id', as: 'policy_package_earn', onDelete: 'CASCADE' });
PolicyPackageEarn.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== CASH_FLOW ↔️ USER (1:N) ==========
User.hasMany(CashFlow, { foreignKey: 'user_id', as: 'cash_flows', onDelete: 'CASCADE' });
CashFlow.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== ATTENDED_MEETING ↔️ USER (1:N) ==========
User.hasMany(AttendedMeeting, { foreignKey: 'user_id', as: 'attended_meetings', onDelete: 'CASCADE' });
AttendedMeeting.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

// ========== ATTENDED_MEETING ↔️ MEETING (1:N) ==========
Meeting.hasMany(AttendedMeeting, { foreignKey: 'meeting_id', as: 'attendees', onDelete: 'CASCADE' });
AttendedMeeting.belongsTo(Meeting, { foreignKey: 'meeting_id', as: 'meeting', onDelete: 'CASCADE' });

const models = {
    Role,
    Permission,
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
    UserSpringFestivalCheckIn,
    UserSpringFestivalCheckInLog,
    SpringWhiteList,
    GoldPackageHistory,
    GoldPackageBonuses,
    GoldPackageReturn,
    GoldPackageRepurchase,
    GoldPlanCheckIn,
    BalanceTransfer,
    MasonicPackageHistory,
    MasonicPackageBonuses,
    MasonicPackageEarn,
    GoldCouponTemp,
    FederalReserveGoldPackage,
    FederalReserveGoldPackageHistory,
    FederalReserveGoldPackageBonuses,
    FederalReserveGoldPackageEarn,
    PolicyPackage,
    PolicyPackageHistory,
    PolicyPackageBonuses,
    PolicyPackageEarn,
    CashFlow,
    Meeting,
    AttendedMeeting,
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