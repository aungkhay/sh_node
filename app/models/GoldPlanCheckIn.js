const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class GoldPlanCheckIn extends Model {}

GoldPlanCheckIn.init({
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
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    gold_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
}, {
    sequelize,
    modelName: 'GoldPlanCheckIn',
    tableName: 'gold_plan_check_in',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = GoldPlanCheckIn
