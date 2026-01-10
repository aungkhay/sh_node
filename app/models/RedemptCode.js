const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

class RedemptCode extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.amount !== undefined)
            attributes.amount = Number(attributes.amount)
        return attributes
    }
}

RedemptCode.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,    
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    is_used: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 0,
        comment: '0 => Not Used | 1 => Used'
    },
    used_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    type: {
        type: DataTypes.INTEGER,
        comment: '1 => 共济基金增加 | 2 => 共济基金发放 | 3 => 经验值增加 | 4 => 黄金券发放 | 5 => 上合组织中国区授权书',
        allowNull: false,
        defaultValue: 1,
    }
}, {
    sequelize,
    modelName: 'RedemptCode',
    tableName: 'redempt_codes',
    timestamps: true,
});

module.exports = RedemptCode;
