const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class SpringWhiteList extends Model {}

SpringWhiteList.init({
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
    day_7_rate: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    day_14_rate: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    day_21_rate: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
}, {
    sequelize,
    modelName: 'SpringWhiteList',
    tableName: 'spring_white_list',
    timestamps: true,
    indexes: [
        {
            unique: true,
            name: 'uniq_user_relation',
            fields: ['user_id', 'relation'],
            using: 'BTREE',
        }
    ]
})

module.exports = SpringWhiteList
