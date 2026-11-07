const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const StrategyContributionPackage = require('./StrategyContributionPackage');
const StrategyContributionPackageHistory = require('./StrategyContributionPackageHistory');

class StrategyContributionPackageEarn extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        attributes.amount = Number(attributes.amount);
        return attributes
    }
}

StrategyContributionPackageEarn.init({
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
            model: StrategyContributionPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: StrategyContributionPackageHistory,
            key: 'id'
        },
        defaultValue: 0
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '收益类型: 1-返还申报费, 2-发放战略贡献金',
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'StrategyContributionPackageEarn',
    tableName: 'strategy_contribution_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] }
    ]
})

module.exports = StrategyContributionPackageEarn