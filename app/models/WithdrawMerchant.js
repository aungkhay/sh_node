const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class WithdrawMerchant extends Model {}

WithdrawMerchant.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    api: {
        type: DataTypes.STRING,
        allowNull: false
    },
    app_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    app_code: {
        type: DataTypes.STRING,
        allowNull: true
    },
    app_key: {
        type: DataTypes.STRING,
        allowNull: false
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
    }
}, {
    sequelize,
    modelName: 'WithdrawMerchant',
    tableName: 'withdraw_merchants',
    timestamps: true,
});

module.exports = WithdrawMerchant;
