const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class AllocationAuthBankInfo extends Model {}

AllocationAuthBankInfo.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
        unique: true,
    },
    card_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    card_number: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bank_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'AllocationAuthBankInfo',
    tableName: 'allocation_auth_bank_infos',
    timestamps: true,
});

module.exports = AllocationAuthBankInfo;
