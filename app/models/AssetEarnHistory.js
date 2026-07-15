const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class AssetEarnHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get());

        if (attributes.total_assets !== undefined)
            attributes.total_assets = Number(attributes.total_assets);
        if (attributes.total_product_earn !== undefined)
            attributes.total_product_earn = Number(attributes.total_product_earn);
        if (attributes.daily_earn !== undefined)
            attributes.daily_earn = Number(attributes.daily_earn);
        return attributes;
    }
}

AssetEarnHistory.init({
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
        allowNull: false
    },
    total_assets: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: '总资产',
    },
    total_product_earn: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: '总产品收益',
    },
    daily_earn: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: '每日收益',
    },
}, {
    sequelize,
    modelName: 'AssetEarnHistory',
    tableName: 'asset_earn_histories',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['createdAt'] },
    ]
});

module.exports = AssetEarnHistory
