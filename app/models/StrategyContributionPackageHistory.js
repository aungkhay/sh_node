const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const StrategyContributionPackage = require('./StrategyContributionPackage');

class StrategyContributionPackageHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.contribute_amount)
            attributes.contribute_amount = Number(attributes.contribute_amount);
        if (attributes.payment_per_period)
            attributes.payment_per_period = Number(attributes.payment_per_period);
        if (attributes.total_paid_amount)
            attributes.total_paid_amount = Number(attributes.total_paid_amount);
        return attributes
    }
}

StrategyContributionPackageHistory.init({
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
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    period: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: '缴纳周期',
    },
    payment_per_period: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '每期缴纳金额',
    },
    contribute_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '战略贡献金',
    },
    payment_type: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '缴纳方式: 1-分期付款, 2-一次性付款',
    },
    next_payment_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '下次缴纳日期',
    },
    total_paid_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '已缴纳次数',
    },
    total_paid_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '已缴纳总金额',
    },
    is_returned_price: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已退还申报费',
    },
    is_returned_contribute_amount: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已退还战略贡献金',
    },
    is_finished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否缴纳完成',
    },
    is_gave_shared_home_package: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已发放共建共同家园计划方案',
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'StrategyContributionPackageHistory',
    tableName: 'strategy_contribution_package_history',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_createdAt_user_id',
            fields: ['createdAt', 'user_id'],
            using: 'BTREE'
        },
        {
            name: 'idx_is_finished',
            fields: ['is_finished'],
            using: 'BTREE'
        },
        {
            name: 'idx_package_id_user_id_is_gave_shared_home_package',
            fields: ['package_id', 'user_id', 'is_gave_shared_home_package'],
            using: 'BTREE'
        },
        {
            name: 'idx_is_returned_price_is_returned_contribute_amount',
            fields: ['is_returned_price', 'is_returned_contribute_amount'],
            using: 'BTREE'
        }
    ]
})

module.exports = StrategyContributionPackageHistory