const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const SharingPlanPackage = require('./SharingPlanPackage');

class SharingPlanPackageHistory extends Model {
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

SharingPlanPackageHistory.init({
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
            model: SharingPlanPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    daily_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    share_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '上合共享金',
    },
    return_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '返还日期',
    },
    return_price_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '返还本金日期',
    },
    is_returned_price: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已返还本金',
    },
    return_share_amount_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '返还上合共享金日期',
    },
    is_returned_share_amount: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已返还上合共享金',
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'SharingPlanPackageHistory',
    tableName: 'sharing_plan_package_history',
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
        },
        {
            name: 'idx_description',
            fields: ['description'],
            using: 'BTREE'
        },
        {
            name: 'idx_return_date',
            fields: ['return_date'],
            using: 'BTREE'
        }
    ]
})

module.exports = SharingPlanPackageHistory