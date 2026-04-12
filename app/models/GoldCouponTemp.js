const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const RewardRecord = require('./RewardRecord');

class GoldCouponTemp extends Model {}

GoldCouponTemp.init({
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
    reward_record_id: {
        type: DataTypes.BIGINT,
        references: {
            model: RewardRecord,
            key: 'id'
        }
    },
    model: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.JSON,
        allowNull: false
    },
}, {
    sequelize,
    modelName: 'GoldCouponTemp',
    tableName: 'gold_coupon_temps',
    timestamps: true,
    indexes: [
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
            name: 'idx_user_id_reward_record_id',
            fields: ['user_id', 'reward_record_id'],
            using: 'BTREE',
        },
    ]
});

module.exports = GoldCouponTemp;
