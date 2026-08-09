const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class AssetDailyReleaseExtraPackageTemp extends Model {
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

AssetDailyReleaseExtraPackageTemp.init({
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
        defaultValue: 0
    },
    package_id: {
        type: DataTypes.BIGINT,
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
    target_return_price_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '预计返还本金时间',
    },
    will_finish_on: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '完成时间',
    }
}, {
    sequelize,
    modelName: 'AssetDailyReleaseExtraPackageTemp',
    tableName: 'asset_daily_release_extra_package_temp',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            name: 'idx_user_id',
            fields: ['user_id']
        },
        {
            name: 'idx_package_id',
            fields: ['package_id']
        },
        {
            name: 'idx_created_at_deleted_at',
            fields: ['created_at', 'deleted_at']
        },
    ]
})

module.exports = AssetDailyReleaseExtraPackageTemp
