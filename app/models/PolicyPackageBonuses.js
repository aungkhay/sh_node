const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const PolicyPackageHistory = require('./PolicyPackageHistory');

class PolicyPackageBonuses extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        attributes.amount = Number(attributes.amount);
        return attributes
    }
}

PolicyPackageBonuses.init({
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
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: PolicyPackageHistory,
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
    modelName: 'PolicyPackageBonuses',
    tableName: 'policy_package_bonuses',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
});

module.exports = PolicyPackageBonuses;
