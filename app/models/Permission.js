const { DataTypes, Model } = require('sequelize');
const sequelize = require('../connections/Mysql');

class Permission extends Model { }

Permission.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    }
}, {
    sequelize,
    modelName: 'Permission',
    tableName: 'permissions'
})

module.exports = Permission