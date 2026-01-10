const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class UserRankPoint extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        attributes.amount = Number(attributes.amount);
        return attributes
    }
}

UserRankPoint.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '1 => KYC | 2 => News | 3 => Agreement Status'
    },
    from: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
    },
    to: {
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
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'UserRankPoint',
    tableName: 'user_rank_points',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['from'] },
        { fields: ['to'] },
    ]
});

module.exports = UserRankPoint;
