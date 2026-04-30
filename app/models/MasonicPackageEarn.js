const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const MasonicPackageHistory = require('./MasonicPackageHistory');
const MasonicPackage = require('./MasonicPackage');

class MasonicPackageEarn extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.amount)
            attributes.amount = Number(attributes.amount);
        return attributes
    }
}

MasonicPackageEarn.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true
    },  
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        defaultValue: 0
    },
    package_id: {
        type: DataTypes.BIGINT,
        references: {
            model: MasonicPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: MasonicPackageHistory,
            key: 'id'
        },
        defaultValue: 0
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
    modelName: 'MasonicPackageEarn',
    tableName: 'masonic_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['package_id'] },
    ]
})

module.exports = MasonicPackageEarn
