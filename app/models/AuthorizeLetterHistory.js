const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const AuthorizeLetter = require('./AuthorizeLetter');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class AuthorizeLetterHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        if (attributes.gold_count)
            attributes.gold_count = Number(attributes.gold_count);
        return attributes
    }
}

AuthorizeLetterHistory.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    relation: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: User,
            key: 'id',
        },
    },
    letter_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: AuthorizeLetter,
            key: 'id',
        },
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
    },
    gold_count: {
        type: DataTypes.DOUBLE(18,8),
        allowNull: false,
        defaultValue: 0,
    },
    gold_owner_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
    },
    from_user_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: User,
            key: 'id',
        },
    },
    is_used: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
    },
    is_group_used: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
    },
    group_number: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    product_type: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '1-红包雨, 2-黄金礼包, 3-终身授权, 4-贡献, 5-联储, 6-纪念币, 7-黄金增值, 8-个人储备计划',
    },
    transfer_remark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    finished_date: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    is_moved_to_total_gold_count: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0 => No | 1 => Yes'
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'AuthorizeLetterHistory',
    tableName: 'authorize_letter_histories',
    timestamps: true,
    paranoid: true,
});

module.exports = AuthorizeLetterHistory;