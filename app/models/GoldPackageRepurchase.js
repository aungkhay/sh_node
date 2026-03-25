const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class GoldPackageRepurchase extends Model {}

GoldPackageRepurchase.init({
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
    gold_count: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: '回购的黄金数量'
    },
    gold_rate: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: '回购时的黄金价格（元/克）'
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: '回购金额'
    },
    handling_fee: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: '回购手续费'
    },
}, {
    sequelize,
    modelName: 'GoldPackageRepurchase',
    tableName: 'gold_package_repurchase',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = GoldPackageRepurchase
