const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class UserSpringFestivalCheckIn extends Model {}

UserSpringFestivalCheckIn.init({
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
    total_check_in: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    last_check_in_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_completed_7: {
        type: DataTypes.TINYINT,
        defaultValue: 0
    },
    is_completed_14: {
        type: DataTypes.TINYINT,
        defaultValue: 0
    },
    is_completed_21: {
        type: DataTypes.TINYINT,
        defaultValue: 0
    },
    start_counting_date: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'UserSpringFestivalCheckIn',
    tableName: 'user_spring_festival_check_in',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        }
    ]
})

module.exports = UserSpringFestivalCheckIn
