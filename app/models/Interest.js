const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class Interest extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());

        attributes.amount = Number(attributes.amount);
        attributes.before_amount = Number(attributes.before_amount);
        attributes.after_amount = Number(attributes.after_amount);

        return attributes;
    }
}

Interest.init({
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
    ModelName: 'Interest',
    tableName: 'earn_interests',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = Interest
