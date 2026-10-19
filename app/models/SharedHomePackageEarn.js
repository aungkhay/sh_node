const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const SharedHomePackage = require('./SharedHomePackage');
const SharedHomePackageHistory = require('./SharedHomePackageHistory');

class SharedHomePackageEarn extends Model {}

SharedHomePackageEarn.init({
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
            model: SharedHomePackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: SharedHomePackageHistory,
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
        defaultValue: 0,
        comment: '0 => 每日收益, 1 => 返还上合共享金, 2 => 本金返还'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'SharedHomePackageEarn',
    tableName: 'shared_home_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['type']},
        {
            name: 'idx_user_id_package_id_type',
            fields: ['user_id', 'package_id', 'type']
        }
    ]
})

module.exports = SharedHomePackageEarn