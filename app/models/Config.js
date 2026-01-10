const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class Config extends Model {}

Config.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    val: {
        type: DataTypes.TEXT('medium'),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT("tiny"),
        allowNull: true
    },
    data_type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    ModelName: 'Config',
    tableName: 'configs'
})

module.exports = Config
