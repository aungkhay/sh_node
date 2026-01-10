const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class UserBank extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

UserBank.init({
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
        allowNull: false,
    },
    card_number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phone_number: {
        type: DataTypes.STRING(11),
        allowNull: false,
        validate: {
            is: /^\d{11}$/,
        },
    },
    bank_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    bank_card_pic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'DECLINED'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'UserBank',
    tableName: 'user_banks',
    timestamps: true,
    paranoid: true
});

module.exports = UserBank;
