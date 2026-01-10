const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class RewardType extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());
        if (attributes.amount_min !== undefined)
            attributes.amount_min = Number(attributes.amount_min);
        if (attributes.amount_max !== undefined)
            attributes.amount_max = Number(attributes.amount_max);

        return attributes
    }
}

RewardType.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    range_min: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    total_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '每日总数'
    },
    remain_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '剩余每日总数'
    },
    range_max: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    amount_min: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    amount_max: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    settings: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
    },
    status: {
        type: DataTypes.TINYINT,
        defaultValue: 1,
        comment: '0: 禁用, 1: 启用'
    },
    is_energy_forum: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0: 否, 1: 是'
    }
}, {
    sequelize,
    modelName: 'RewardType',
    tableName: 'reward_types',
    timestamps: true,
});

module.exports = RewardType;
