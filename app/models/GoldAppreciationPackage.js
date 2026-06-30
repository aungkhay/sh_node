const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class GoldAppreciationPackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.reserve_earn)
            attributes.reserve_earn = Number(attributes.reserve_earn);
        if (attributes.personal_gold)
            attributes.personal_gold = Number(attributes.personal_gold);
        if (attributes.tag)
            attributes.tag = attributes.tag.split('|');

        return attributes
    }
}

GoldAppreciationPackage.init({
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
        comment: '周期(期)',
    },
    reserve_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '战略储备金',
    },
    release_reserve_earn_at: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '战略储备金发放时间',
    },
    gold_appreciation_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '黄金增值金',
    },
    is_release_authorize_letter: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '上合组织吉尔吉斯斯坦区授权书',
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
    ribbon_content: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '产品标签内容',
    },
    is_send_other_package: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '是否赠送其他产品, 仅在buy_one_get_quantity大于0时有效',
    },
    send_other_package_id: {
        type: DataTypes.BIGINT,
        references: {
            model: GoldAppreciationPackage,
            key: 'id'
        },
        allowNull: true,
        comment: '购买本产品后赠送的其他产品ID, 仅在buy_one_get_quantity大于0时有效',
    },
    give_fragment: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '是否赠送碎片',
    },
    can_exchange_fragment: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '是否可以兑换碎片',
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
    modelName: 'GoldAppreciationPackage',
    tableName: 'gold_appreciation_packages',
    timestamps: true,
});

module.exports = GoldAppreciationPackage;
