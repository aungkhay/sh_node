const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const Notification = require('./Notification');

class SpecificUserNotification extends Model { }

SpecificUserNotification.init({
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
    modelName: 'SpecificUserNotification',
    tableName: 'specific_user_notifications',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'notification_id'],
        },
    ],
});

module.exports = SpecificUserNotification