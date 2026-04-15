const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class MasonicPackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.daily_earn)
            attributes.daily_earn = Number(attributes.daily_earn);
        if (attributes.masonic_fund)
            attributes.masonic_fund = Number(attributes.masonic_fund);

        return attributes
    }
}

MasonicPackage.init({
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
    daily_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '终身日收益',
    },
    masonic_fund: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '共济基金金额',
    },
    is_release_authorize_letter: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '上合组织塔吉克斯坦区授权书',
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
    cover_image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'MasonicPackage',
    tableName: 'masonic_packages',
    timestamps: true,
});

module.exports = MasonicPackage;
