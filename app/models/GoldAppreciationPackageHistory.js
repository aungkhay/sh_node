const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const GoldAppreciationPackage = require('./GoldAppreciationPackage');

class GoldAppreciationPackageHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.reserve_earn)
            attributes.reserve_earn = Number(attributes.reserve_earn);
        if (attributes.gold_appreciation_earn)
            attributes.gold_appreciation_earn = Number(attributes.gold_appreciation_earn);
        return attributes
    }
}

GoldAppreciationPackageHistory.init({
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
            model: GoldAppreciationPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    reserve_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    gold_appreciation_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '黄金增值金',
    },
    period: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '周期(期)',
    },
    return_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '预计返还日期',
    },
    is_returned_earn: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已返还收益',
    },
    return_earn_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '实际返还收益日期',
    },
    is_returned_price: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已返还本金',
    },
    return_price_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '实际返还本金日期',
    },
    gold_appreciation_earn_count_remain: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '未返还的黄金增值金数量',
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
    modelName: 'GoldAppreciationPackageHistory',
    tableName: 'gold_appreciation_package_history',
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
        }
    ]
})

module.exports = GoldAppreciationPackageHistory
