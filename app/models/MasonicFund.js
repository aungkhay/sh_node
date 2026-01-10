const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class MasonicFund extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());

        attributes.amount = Number(attributes.amount);

        return attributes;
    }
}

MasonicFund.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: '2000000'
    },
    is_expired: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0 => Expired | 1 => Alive'
    }
}, {
    sequelize,
    modelName: 'MasonicFund',
    tableName: 'masonic_funds',
    timestamps: false,
});

module.exports = MasonicFund;
