const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const News = require('./News');

class NewsReports extends Model {}

NewsReports.init({
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
    description: {
        type: DataTypes.TEXT('long'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'DENIED'),
        defaultValue: 'PENDING'
    }
}, {
    sequelize,
    modelName: 'NewsReports',
    tableName: 'news_reports',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['news_id', 'user_id'],
            name: 'unique_report'
        },
        { fields: ['relation'] }
    ]
});

module.exports = NewsReports;
