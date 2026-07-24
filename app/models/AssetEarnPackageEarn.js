const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const AssetEarnPackage = require('./AssetEarnPackage');
const AssetEarnPackageHistory = require('./AssetEarnPackageHistory');

class AssetEarnPackageEarn extends Model {}

AssetEarnPackageEarn.init({
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
            model: AssetEarnPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: AssetEarnPackageHistory,
            key: 'id'
        },
        defaultValue: 0
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'AssetEarnPackageEarn',
    tableName: 'asset_earn_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['package_id'] },
        {
            name: 'idx_user_id_package_history_id',
            fields: ['user_id', 'package_history_id'],
        },
    ]
})

module.exports = AssetEarnPackageEarn
