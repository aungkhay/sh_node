const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class ShanghaiCooperation extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.exchange_value)
            attributes.exchange_value = Number(attributes.exchange_value);
        if (attributes.masonic_fund)
            attributes.masonic_fund = Number(attributes.masonic_fund);
        if (attributes.coin)
            attributes.coin = Number(attributes.coin);
        if (attributes.tag)
            attributes.tag = attributes.tag.split('|');

        return attributes
    }
}

ShanghaiCooperation.init({
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
    },
    exchange_value: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '兑换价值 - 到期发放到余额',
    },
    masonic_fund: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '共济基金',
    },
    coin: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '实体纪念币 - Reward Type 14',
    },
    period: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '周期',
    },
    perchase_limit: {
        type: DataTypes.ENUM('NONE', 'DAILY', 'TOTAL'),
        allowNull: false,
        defaultValue: 'NONE',
        comment: '限购方式: NONE-不限购, DAILY-每日限购, TOTAL-累计限购',
    },
    quantity_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '限购数量, 仅在perchase_limit不为NONE时有效',
    },
    total_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '总发售数量, 0表示不限量',
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
    can_new_registered_user_get_free: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '新注册用户是否可以免费领取',
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
    modelName: 'ShanghaiCooperation',
    tableName: 'shanghai_cooperation',
    timestamps: true,
});

module.exports = ShanghaiCooperation;
