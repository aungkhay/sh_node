const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class Impeachment extends Model { }

Impeachment.init({
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
    parent_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false
    },
    child_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false
    },
    type: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '1 => 降薪 | 2 => 停职 | 3 => 封禁'
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
    remark: {
        type: DataTypes.TEXT('tiny'),
        allowNull: true
    }
}, {
    sequelize,
    ModelName: 'Impeachment',
    tableName: 'impeachments',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = Impeachment
