const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const DepositMerchant = require('./DepositMerchant');

class MerchantChannel extends Model {}

MerchantChannel.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    deposit_merchant_id: {
        type: DataTypes.BIGINT,
        references: {
            model: DepositMerchant,
            key: 'id'
        },
        allowNull: null,
    },
    payment_method: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 => 微信, 2 => 支付宝, 3 => 云闪付, 4 => 银联'
    },
    merchant_channel: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    channel_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    min_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    max_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    },
    sort: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
    sequelize,
    modelName: 'MerchantChannel',
    tableName: 'merchant_channels',
    timestamps: true,
});

module.exports = MerchantChannel;
