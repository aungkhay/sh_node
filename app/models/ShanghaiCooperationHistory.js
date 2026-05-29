const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const ShanghaiCooperation = require('./ShanghaiCooperation');

class ShanghaiCooperationHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.exchange_value)
            attributes.exchange_value = Number(attributes.exchange_value);
        return attributes
    }
}

ShanghaiCooperationHistory.init({
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
            model: ShanghaiCooperation,
            key: 'id'
        },
        defaultValue: 0
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    exchange_value: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    masonic_fund: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '到期时间'
    },
    is_returned_price: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
    },
    return_price_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '本金返还时间'
    },
    is_returned_exchange_value: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
    },
    return_exchange_value_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '兑换价值返还时间'
    },
    is_returned_masonic_fund: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
    },
    return_masonic_fund_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '共济基金返还时间'
    },
    is_returned_all: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'ShanghaiCooperationHistory',
    tableName: 'shanghai_cooperation_history',
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
        }
    ]
})

module.exports = ShanghaiCooperationHistory
