const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class Transaction extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        attributes.amount = Number(attributes.amount);
        return attributes
    }
}

Transaction.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true,
    },
    wallet_type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 => 储备金 | 2 => 余额 | 3 => 推荐金 | 4 => 共济基金 | 5 => 军职津贴 | 6 => 预压津贴'
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 => 充值 | 2 => 提现 | 3 => 转化 | 4 => 兑换预压津贴'
    },
    amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0'
    },
    from: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    to: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.TINYINT,
        defaultValue: '0',
        comment: '0 => PENDIGN | 1 => SUCCESS | 2 => FAILED'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['wallet_type'] },
        { fields: ['type'] },
        { fields: ['status'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = Transaction;
