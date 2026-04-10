const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class BalanceTransfer extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        if (attributes.amount !== undefined)
            attributes.amount = Number(attributes.amount);
        if (attributes.before_from_amount !== undefined)
            attributes.before_from_amount = Number(attributes.before_from_amount);
        if (attributes.after_from_amount !== undefined)
            attributes.after_from_amount = Number(attributes.after_from_amount);
        if (attributes.before_to_amount !== undefined)
            attributes.before_to_amount = Number(attributes.before_to_amount);
        if (attributes.after_to_amount !== undefined)
            attributes.after_to_amount = Number(attributes.after_to_amount);
        return attributes
    }
}

BalanceTransfer.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
    },
    from_user: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
    },
    to_user: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
    },
    before_from_amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
    },
    after_from_amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
    },
    before_to_amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
    },
    after_to_amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
    },
}, {
    sequelize,
    modelName: 'BalanceTransfer',
    tableName: 'balance_transfers',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = BalanceTransfer;
