const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class UserBonus extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        attributes.amount = Number(attributes.amount);
        return attributes
    }
}

UserBonus.init({
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
    from_user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'UserBonus',
    tableName: 'user_bonuses',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
});

module.exports = UserBonus;
