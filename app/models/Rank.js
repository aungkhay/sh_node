const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class Rank extends Model { }

Rank.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    pic: {
        type: DataTypes.STRING,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    number_of_impeach: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Impeach count per month'
    },
    point: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '经验值'
    },
    allowance: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    allowance_rate: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    salary_rate: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    welcome_message: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Rank',
    tableName: 'ranks',
    timestamps: false,
});

module.exports = Rank;
