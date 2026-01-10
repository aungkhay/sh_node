const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class Notification extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

Notification.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "1 => 平台公告 | 2 => 平台通知 | 3 => 站内信"
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    subtitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
    },
    status: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0 => Disabled | 1 => Enabled'
    }
}, {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    paranoid: true
});

module.exports = Notification