const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class ApprovalFundPackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.approval_fund)
            attributes.approval_fund = Number(attributes.approval_fund);
        if (attributes.tag)
            attributes.tag = attributes.tag.split('|');

        return attributes
    }
}

ApprovalFundPackage.init({
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
        comment: '审批费',
    },
    period: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '审批周期(天)',
    },
    approval_fund: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '审批资金 (0为全额审批)',
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
    modelName: 'ApprovalFundPackage',
    tableName: 'approval_fund_packages',
    timestamps: true,
});

module.exports = ApprovalFundPackage;
