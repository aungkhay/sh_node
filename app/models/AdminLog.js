const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class AdminLog extends Model {}

AdminLog.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true,
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    admin_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        defaultValue: 0
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    content: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: '{}'
    },
    ip: {
        type: DataTypes.STRING,
        defaultValue: '0.0.0.0'
    },
    remark: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    }
}, {
    sequelize,
    ModelName: 'AdminLog',
    tableName: 'admin_logs',
    indexes: [
        {
            name: 'idx_type',
            fields: ['type'],
            using: 'BTREE',
        },
        {
            name: 'idx_model',
            fields: ['model'],
            using: 'BTREE',
        },
        { fields: ['relation'] },
    ]
})

module.exports = AdminLog
