const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const NewChapterPackage = require('./NewChapterPackage');
const NewChapterPackageHistory = require('./NewChapterPackageHistory');

class NewChapterPackageEarn extends Model {}

NewChapterPackageEarn.init({
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
            model: NewChapterPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    package_history_id: {
        type: DataTypes.BIGINT,
        references: {
            model: NewChapterPackageHistory,
            key: 'id'
        },
        defaultValue: 0
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    type: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '1 => 共享发展金 | 2 => 上合共享金 | 3 => 本金'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'NewChapterPackageEarn',
    tableName: 'new_chapter_package_earn',
    timestamps: true,
    indexes: [
        { fields: ['relation'] },
    ]
})

module.exports = NewChapterPackageEarn