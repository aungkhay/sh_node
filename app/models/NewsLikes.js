const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const News = require('./News');

class NewsLikes extends Model {}

NewsLikes.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: true,
    },
    news_id : {
        type: DataTypes.BIGINT,
        references: {
            model: News,
            key: 'id'
        },
        allowNull: true
    },
}, {
    sequelize,
    modelName: 'NewsLikes',
    tableName: 'news_likes',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['news_id', 'user_id'],
            name: 'unique_like'
        },
        { fields: ['relation'] }
    ]
});

module.exports = NewsLikes;
