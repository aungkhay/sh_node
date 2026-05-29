const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const ShanghaiCooperationHistory = require('./ShanghaiCooperationHistory');
const ShanghaiCooperation = require('./ShanghaiCooperation');

class ShanghaiCooperationEarn extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.amount)
            attributes.amount = Number(attributes.amount);
        return attributes
    }
}

ShanghaiCooperationEarn.init({
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
    package_id: {
        type: DataTypes.BIGINT,
        references: {
            model: ShanghaiCooperation,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: ShanghaiCooperationHistory,
            key: 'id'
        },
        defaultValue: 0
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0-共济基金返还, 1-兑换价值返还, 2-本金返还'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'ShanghaiCooperationEarn',
    tableName: 'shanghai_cooperation_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['package_id'] },
    ]
})

module.exports = ShanghaiCooperationEarn
