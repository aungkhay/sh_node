const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const SharedHomePackage = require('./SharedHomePackage');

class SharedHomePackageHistory extends Model {
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

SharedHomePackageHistory.init({
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
            model: SharedHomePackage,
            key: 'id'
        },
        defaultValue: 0
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
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
        comment: '计划收益时间',
    },
    earn_amount_per_count: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '首月发放收益',
    },
    share_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '上合共享金',
    },
    release_earn_count_at: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 12,
        comment: '第12次发放收益',
    },
    released_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '已发放次数',
    },
    month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'month count',
    },
    is_finished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否完成',
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
    modelName: 'SharedHomePackageHistory',
    tableName: 'shared_home_package_history',
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
            name: 'idx_is_finished',
            fields: ['is_finished'],
            using: 'BTREE'
        }
    ]
})

module.exports = SharedHomePackageHistory