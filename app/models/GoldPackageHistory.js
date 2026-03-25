const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class GoldPackageHistory extends Model {}

GoldPackageHistory.init({
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
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    reimbursement_rate: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: '70'
    },
    reimbursement_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    return_rate: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: '0-0'
    },
    is_reimbursed: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0
    },
    validUntil: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'GoldPackageHistory',
    tableName: 'gold_package_history',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_package_id',
            fields: ['package_id'],
            using: 'BTREE',
        }
    ]
})

module.exports = GoldPackageHistory
