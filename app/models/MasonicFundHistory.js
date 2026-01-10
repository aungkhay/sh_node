const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class MasonicFundHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());

        attributes.amount = Number(attributes.amount);

        return attributes;
    }
}

MasonicFundHistory.init({
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
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_imported: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0 => No | 1 => Yes'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'DENIED'),
        defaultValue: 'PENDING',
        allowNull: false,
    }
}, {
    sequelize,
    modelName: 'MasonicFundHistory',
    tableName: 'masonic_fund_history',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
});

module.exports = MasonicFundHistory;
