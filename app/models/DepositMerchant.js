const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class DepositMerchant extends Model {}

DepositMerchant.init({
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
    status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1
    },
    allow_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '1,2,3,4,...'
    },
    min_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    max_amount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    }
}, {
    sequelize,
    modelName: 'DepositMerchant',
    tableName: 'deposit_merchants',
    timestamps: true,
});

module.exports = DepositMerchant;
