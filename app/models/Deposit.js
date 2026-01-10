const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const DepositMerchant = require('./DepositMerchant');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class Deposit extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        if (attributes.amount !== undefined)
            attributes.amount = Number(attributes.amount);
        if (attributes.before_amount !== undefined)
            attributes.before_amount = Number(attributes.before_amount);
        if (attributes.after_amount !== undefined)
            attributes.after_amount = Number(attributes.after_amount);
        return attributes
    }
}

Deposit.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    deposit_merchant_id: {
        type: DataTypes.BIGINT,
        references: {
            model: DepositMerchant,
            key: 'id'
        },
        allowNull: null,
    },
    order_no: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    merchant_order_no: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 => 微信, 2 => 支付宝, 3 => 云闪付, 4 => 银联'
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
    amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
    },
    before_amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
        comment: "User's reserve_fund"
    },
    after_amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
        comment: "User's reserve_fund"
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
    modelName: 'Deposit',
    tableName: 'deposits',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['type'] },
        { fields: ['relation'] },
        { fields: ['status'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = Deposit;
