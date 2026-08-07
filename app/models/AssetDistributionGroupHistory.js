const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class AssetDistributionGroupHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.amount)
            attributes.amount = Number(attributes.amount);
        return attributes
    }
}

AssetDistributionGroupHistory.init({
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
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '分发金额',
    },
    release_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '分发时间',
    },
    released_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '实际分发时间',
    },
    is_released: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '是否已分发',
    },
    is_release_stuck: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '是否分发卡住',
    },
}, {
    sequelize,
    modelName: 'AssetDistributionGroupHistory',
    tableName: 'asset_distribution_group_history',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_user_id_released_at',
            fields: ['user_id', 'released_at'],
            using: 'BTREE',
        },
        {
            name: 'idx_is_release_stuck',
            fields: ['is_release_stuck'],
            using: 'BTREE',
        },
        {
            name: 'idx_createdAt',
            fields: ['createdAt'],
            using: 'BTREE'
        }
    ]
})

module.exports = AssetDistributionGroupHistory
