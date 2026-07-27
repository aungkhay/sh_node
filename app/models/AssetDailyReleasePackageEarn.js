const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const AssetDailyReleasePackage = require('./AssetDailyReleasePackage');
const AssetDailyReleasePackageHistory = require('./AssetDailyReleasePackageHistory');

class AssetDailyReleasePackageEarn extends Model {}

AssetDailyReleasePackageEarn.init({
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
            model: AssetDailyReleasePackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: AssetDailyReleasePackageHistory,
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
    modelName: 'AssetDailyReleasePackageEarn',
    tableName: 'asset_daily_release_package_earn',
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

module.exports = AssetDailyReleasePackageEarn
