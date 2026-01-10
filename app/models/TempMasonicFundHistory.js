const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class TempMasonicFundHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());

        attributes.amount = Number(attributes.amount);

        return attributes;
    }
}

TempMasonicFundHistory.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    phone_number: {
        type: DataTypes.STRING(11),
        allowNull: false,
        unique: true,
        validate: {
            is: /^\d{11}$/,
        },
    },
    amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'TempMasonicFundHistory',
    tableName: 'temp_masonic_fund_history',
    timestamps: false,
});

module.exports = TempMasonicFundHistory;
