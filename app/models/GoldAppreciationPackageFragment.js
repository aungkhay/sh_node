const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const GoldAppreciationPackage = require('./GoldAppreciationPackage');
const GoldAppreciationPackageHistory = require('./GoldAppreciationPackageHistory');

class GoldAppreciationPackageFragment extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.reserve_earn)
            attributes.reserve_earn = Number(attributes.reserve_earn);
        if (attributes.gold_appreciation_earn)
            attributes.gold_appreciation_earn = Number(attributes.gold_appreciation_earn);
        return attributes
    }
}

GoldAppreciationPackageFragment.init({
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
            model: GoldAppreciationPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: GoldAppreciationPackageHistory,
            key: 'id'
        },
        defaultValue: 0
    },
    is_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    }
}, {
    sequelize,
    modelName: 'GoldAppreciationPackageFragment',
    tableName: 'gold_appreciation_package_fragment',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_createdAt_user_id',
            fields: ['createdAt', 'user_id'],
            using: 'BTREE'
        }
    ]
})

module.exports = GoldAppreciationPackageFragment
