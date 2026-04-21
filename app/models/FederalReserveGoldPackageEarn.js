const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const MasonicPackageHistory = require('./MasonicPackageHistory');
const MasonicPackage = require('./MasonicPackage');
const FederalReserveGoldPackage = require('./FederalReserveGoldPackage');
const FederalReserveGoldPackageHistory = require('./FederalReserveGoldPackageHistory');

class FederalReserveGoldPackageEarn extends Model {}

FederalReserveGoldPackageEarn.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true
    },  
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        defaultValue: 0
    },
    package_id: {
        type: DataTypes.BIGINT,
        references: {
            model: FederalReserveGoldPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: FederalReserveGoldPackageHistory,
            key: 'id'
        },
        defaultValue: 0
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '类型: 0-储备收益, 1-个人黄金, 2-本金返还',
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'FederalReserveGoldPackageEarn',
    tableName: 'federal_reserve_gold_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['package_id'] },
        { fields: ['type'] },
    ]
})

module.exports = FederalReserveGoldPackageEarn
