const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class SharedHomePackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.earn_amount_per_count)
            attributes.earn_amount_per_count = Number(attributes.earn_amount_per_count);
        if (attributes.share_amount)
            attributes.share_amount = Number(attributes.share_amount);
        if (attributes.tag)
            attributes.tag = attributes.tag.split('|');

        return attributes
    }
}

SharedHomePackage.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    product_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '申购金额',
    },
    total_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        comment: '总月数',
    },
    earn_count_per_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 6,
        comment: '计划收益次数/每月',
    },
    earn_amount_per_count: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '首月发放收益',
    },
    total_earn_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '计划收益总额',
    },
    share_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '上合共享金',
    },
    released_earn_count_at: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 12,
        comment: '第12次发放收益',
    },
    purchase_limit: {
        type: DataTypes.ENUM('NONE', 'DAILY', 'TOTAL'),
        allowNull: false,
        defaultValue: 'NONE',
        comment: '限购方式: NONE-不限购, DAILY-每日限购, TOTAL-累计限购',
    },
    quantity_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '限购数量, 仅在purchase_limit不为NONE时有效',
    },
    total_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '总发行数量',
    },
    buy_one_get_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '买一赠一数量, 0表示不赠送',
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '状态: 1-在售, 2-下架, 3-售罄',
    },
    cover_image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tag: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '标签 | 分隔',
    },
}, {
    sequelize,
    modelName: 'SharedHomePackage',
    tableName: 'shared_home_packages',
    timestamps: true,
});

module.exports = SharedHomePackage;