const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const RewardType = require('./RewardType');

class RewardRecord extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.amount !== undefined)
            attributes.amount = Number(attributes.amount)
        if (attributes.before_amount !== undefined)
            attributes.before_amount = Number(attributes.before_amount)
        if (attributes.after_amount !== undefined)
            attributes.after_amount = Number(attributes.after_amount)
        return attributes
    }
}

RewardRecord.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true
    },
    reward_id: {
        type: DataTypes.BIGINT,
        references: {
            model: RewardType,
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0',
        comment: 'For reward 1 and 3'
    },
    is_used: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: 'For reward 4, 6 and 8 (0 => Not Used | 1 => Used)'
    },
    validedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    before_amount: {
        type: DataTypes.DECIMAL(20,8),
        allowNull: false,
        defaultValue: 0,
    },
    after_amount: {
        type: DataTypes.DECIMAL(20,8),
        allowNull: false,
        defaultValue: 0,
    },
    from_where: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_background_added: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: 'Indicates if added in background (0 => No | 1 => Yes)'
    },
    is_spring_festival_event: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0 => No | 1 => Yes'
    },
    check_in_type: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '1: 签到 2: 补签'
    }
}, {
    sequelize,
    modelName: 'RewardRecord',
    tableName: 'reward_records',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_createdAt',
            fields: ['createdAt'],
            using: 'BTREE',
        },
        {
            name: 'idx_user_id_createdAt',
            fields: ['user_id', 'createdAt'],
            using: 'BTREE',
        },
        {
            name: 'idx_user_id_reward_id',
            fields: ['user_id', 'reward_id'],
            using: 'BTREE',
        },
        {
            name: 'idx_user_id_reward_id_is_used_amount',
            fields: ['user_id', 'reward_id', 'is_used', 'amount'],
            using: 'BTREE',
        }
    ]
});

module.exports = RewardRecord;
