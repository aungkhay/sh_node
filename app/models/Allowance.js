const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const Rank = require('./Rank');

class Allowance extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());

        attributes.amount = Number(attributes.amount);
        attributes.freeze_amount = Number(attributes.freeze_amount);

        return attributes;
    }
}

Allowance.init({
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
    rank_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Rank,
            key: 'id'
        },
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    freeze_amount: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    allowance_rate: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    is_calculated: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0 => Not Calculate | 1 => Calculated (80% remaining)'
    }
}, {
    sequelize,
    ModelName: 'Allowance',
    tableName: 'allowances',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = Allowance
