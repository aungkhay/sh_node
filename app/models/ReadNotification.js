const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const Notification = require('./Notification');

class ReadNotification extends Model { }

ReadNotification.init({
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
    },
    notification_id: {
         type: DataTypes.BIGINT,
         references: {
            model: Notification,
            key: 'id'
        },
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'ReadNotification',
    tableName: 'read_notifications',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'notification_id'],
        },
    ],
});

module.exports = ReadNotification