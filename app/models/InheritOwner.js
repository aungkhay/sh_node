const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class InheritOwner extends Model {}

InheritOwner.init({
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
    inherit_account: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    prove: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT("tiny"),
        allowNull: false
    },
    status: {
         type: DataTypes.ENUM('PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'PENDING',
    }
}, {
    sequelize,
    ModelName: 'InheritOwner',
    tableName: 'inherit_owners',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = InheritOwner
