const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class UserLog extends Model {}

UserLog.init({
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
    ip: {
        type: DataTypes.STRING,
        defaultValue: '0.0.0.0'
    },
}, {
    sequelize,
    ModelName: 'UserLog',
    tableName: 'user_logs',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_created_at',
            fields: ['createdAt'],
            using: 'BTREE',
        }
    ]
})

module.exports = UserLog
