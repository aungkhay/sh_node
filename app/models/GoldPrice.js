const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class GoldPrice extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        attributes.price = Number(attributes.price);
        attributes.reserve_price = Number(attributes.reserve_price);
        return attributes
    }
}

GoldPrice.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        comment: 'CNY'
    },
    reserve_price: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: 'CNY'
    },
}, {
    sequelize,
    modelName: 'GoldPrice',
    tableName: 'gold_prices',
    timestamps: true,
});

module.exports = GoldPrice;
