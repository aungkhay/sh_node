const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class FederalReserveGoldPackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.reserve_earn)
            attributes.reserve_earn = Number(attributes.reserve_earn);
        if (attributes.personal_gold)
            attributes.personal_gold = Number(attributes.personal_gold);

        return attributes
    }
}

FederalReserveGoldPackage.init({
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
    period: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '周期(天)',
    },
    reserve_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '储备收益',
    },
    personal_gold: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '个人黄金(g)',
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
        comment: '上合组织哈萨克斯坦区授权书',
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
    modelName: 'FederalReserveGoldPackage',
    tableName: 'federal_reserve_gold_packages',
    timestamps: true,
});

module.exports = FederalReserveGoldPackage;
