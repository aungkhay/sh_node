const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const ConnectivityThemePackage = require('./ConnectivityThemePackage');
const ConnectivityThemePackageHistory = require('./ConnectivityThemePackageHistory');

class ConnectivityThemePackageEarn extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        attributes.amount = Number(attributes.amount);
        return attributes
    }
}

ConnectivityThemePackageEarn.init({
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
            model: ConnectivityThemePackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: ConnectivityThemePackageHistory,
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
    modelName: 'ConnectivityThemePackageEarn',
    tableName: 'connectivity_theme_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] }
    ]
})

module.exports = ConnectivityThemePackageEarn