const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const DepositMerchant = require('./DepositMerchant');
const WithdrawMerchant = require('./WithdrawMerchant');

class WithdrawMerchantChannel extends Model {}

WithdrawMerchantChannel.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    withdraw_merchant_id: {
        type: DataTypes.BIGINT,
        references: {
            model: WithdrawMerchant,
            key: 'id'
        },
        allowNull: true,
    },
    withdraw_method: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 => 银行卡, 2 => 支付宝'
    },
    merchant_channel: {
        type: DataTypes.STRING,
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
    withdraw_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    remain_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    modelName: 'WithdrawMerchantChannel',
    tableName: 'withdraw_merchant_channels',
    timestamps: true,
});

module.exports = WithdrawMerchantChannel;
