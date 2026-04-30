const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class CashFlow extends Model {
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

CashFlow.init({
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
        comment: '1 => 储备金 | 2 => 余额'
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Related model of this transaction, e.g. Deposit, Withdraw, GoldPackageHistory, etc.'
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Action Type'
    },
    amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        comment: 'Amount changed in this transaction'
    },
    before_amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        comment: 'Amount before this transaction'
    },
    after_amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        comment: 'Amount after this transaction'
    },
    flow_status: {
        type: DataTypes.ENUM('IN', 'OUT'),
        allowNull: false,
        comment: 'Transaction flow status: IN for incoming funds, OUT for outgoing funds'
    },
    description: {
        type: DataTypes.STRING(333),
        allowNull: true,
        comment: 'Description of the transaction'
    },
}, {
    sequelize,
    modelName: 'CashFlow',
    tableName: 'CashFlows',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['wallet_type'] },
        { fields: ['model'] },
        { fields: ['type'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = CashFlow;