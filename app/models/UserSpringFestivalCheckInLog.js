const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class UserSpringFestivalCheckInLog extends Model {}

UserSpringFestivalCheckInLog.init({
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
    check_in_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_repair: {
        type: DataTypes.TINYINT,
        defaultValue: 0
    },
    is_background_added: {
        type: DataTypes.TINYINT,
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: 'UserSpringFestivalCheckInLog',
    tableName: 'user_spring_festival_check_in_logs',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        }
    ]
})

module.exports = UserSpringFestivalCheckInLog
