const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class Transfer extends Model {
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

Transfer.init({
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
    wallet_type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 => 储备金 | 2 => 余额 | 3 => 推荐金 | 4 => 共济基金 | 5 => 军职津贴 | 6 => 预压津贴 | 7 => 余额宝 | 8 => 黄金利息 | 9 => 缴纳保证金',
    },
    reward_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(28, 6),
        defaultValue: '0.0',
    },
    from: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    to: {
        type: DataTypes.INTEGER,
        defaultValue: 0
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
    status: {
        type: DataTypes.ENUM('NORMAL', 'PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'NORMAL',
    },
}, {
    sequelize,
    modelName: 'Transfer',
    tableName: 'transfers',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['wallet_type'] },
        { fields: ['reward_id'] },
        { fields: ['from'] },
        { fields: ['to'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = Transfer;
