const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const Rank = require('./Rank');
const User = require('./User');

class RankHistory extends Model {}

RankHistory.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    rank_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Rank,
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        }
    }
}, {
    sequelize,
    modelName: 'RankHistory',
    tableName: 'rank_histories',
    timestamps: true,
});

module.exports = RankHistory;
