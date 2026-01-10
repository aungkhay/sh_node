const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class UserGoldPrice extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        
        if (attributes.gold_count !== undefined)
            attributes.gold_count = Number(attributes.gold_count);
        if (attributes.amount !== undefined)
            attributes.amount = Number(attributes.amount);
        if (attributes.before_amount !== undefined)
            attributes.before_amount = Number(attributes.before_amount);
        if (attributes.after_amount !== undefined)
            attributes.after_amount = Number(attributes.after_amount);
        return attributes
    }
}

UserGoldPrice.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '1 => Buy | 2 => Sell'
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
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    before_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
    after_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false
    },
}, {
    sequelize,
    modelName: 'UserGoldPrice',
    tableName: 'user_gold_prices',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
});

module.exports = UserGoldPrice;
