const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const AssetDailyReleasePackage = require('./AssetDailyReleasePackage');

class AssetDailyReleasePackageHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.asset_fund)
            attributes.asset_fund = Number(attributes.asset_fund);
        if (attributes.daily_earn)
            attributes.daily_earn = Number(attributes.daily_earn);
        return attributes
    }
}

AssetDailyReleasePackageHistory.init({
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
            model: AssetDailyReleasePackage,
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
        comment: '每日收益',
    },
    period: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '周期(天)',
    },
    is_returned_price: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已返还本金',
    },
    returned_price_on: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '返还本金时间',
    },
    is_finished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已完成',
    },
    will_finish_on: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '完成时间',
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
    modelName: 'AssetDailyReleasePackageHistory',
    tableName: 'asset_daily_release_package_history',
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
            name: 'idx_createdAt',
            fields: ['createdAt'],
            using: 'BTREE'
        },
        {
            name: 'idx_is_finished_createdAt',
            fields: ['is_finished', 'createdAt'],
        },
        {
            name: 'idx_price_is_returned_price_createdAt',
            fields: ['price', 'is_returned_price', 'createdAt'],
            using: 'BTREE'
        }
    ]
})

module.exports = AssetDailyReleasePackageHistory
