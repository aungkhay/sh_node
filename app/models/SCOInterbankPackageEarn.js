const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const SCOInterbankPackage = require('./SCOInterbankPackage');
const SCOInterbankPackageHistory = require('./SCOInterbankPackageHistory');

class SCOInterbankPackageEarn extends Model {}

SCOInterbankPackageEarn.init({
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
            model: SCOInterbankPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: SCOInterbankPackageHistory,
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
    modelName: 'SCOInterbankPackageEarn',
    tableName: 'sco_interbank_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['package_id'] },
    ]
});

module.exports = SCOInterbankPackageEarn
