const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class GoldInterest extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());

        attributes.amount = Number(attributes.amount);
        if (attributes.before_amount !== undefined)
            attributes.before_amount = Number(attributes.before_amount);
        if (attributes.after_amount !== undefined)
            attributes.after_amount = Number(attributes.after_amount);

        return attributes;
    }
}

GoldInterest.init({
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
        allowNull: false
    },
    gold_count: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    gold_reserve_price: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    rate: {
        type: DataTypes.DECIMAL(10, 8),
        defaultValue: '0.0'
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    before_amount: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    after_amount: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
}, {
    sequelize,
    ModelName: 'GoldInterest',
    tableName: 'gold_interests',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = GoldInterest
