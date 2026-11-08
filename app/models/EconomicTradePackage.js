const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class EconomicTradePackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.trade_allowance)
            attributes.trade_allowance = Number(attributes.trade_allowance);
        if (attributes.annual_allowance)
            attributes.annual_allowance = Number(attributes.annual_allowance);
        if (attributes.tag)
            attributes.tag = attributes.tag.split('|');

        return attributes
    }
}

EconomicTradePackage.init({
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
        comment: '申购费',
    },
    release_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '发放次数',
    },
    trade_allowance: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '多边经贸金',
    },
    annual_allowance: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '年度补助金',
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
    modelName: 'EconomicTradePackage',
    tableName: 'economic_trade_packages',
    timestamps: true,
});

module.exports = EconomicTradePackage;