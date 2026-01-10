const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class News extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

News.init({
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
        allowNull: true
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "1 => 能量论坛 | 2 => 上合资讯 | 3 => 上合中心"
    },
    title: {
        type: DataTypes.TEXT('medium'),
        allowNull: false,
    },
    subtitle: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    content: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
    },
    file_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    contain_sensitive_word: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '1 => Contain sentive words'
    },
    liked_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    reported_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
    deniedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'News',
    tableName: 'news',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['type'] },
    ]
});

module.exports = News;
