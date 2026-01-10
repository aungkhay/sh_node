const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class UserAlipay extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

UserAlipay.init({
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    account: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    qr_code_pic: {
        type: DataTypes.STRING,
        allowNull: true, // URL or file path
    },
    home_page_screenshot: {
        type: DataTypes.STRING,
        allowNull: true, // URL or file path
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVE', 'DECLINE'),
        allowNull: false,
        defaultValue: 'PENDING',
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'UserAlipay',
    tableName: 'user_alipay',
    timestamps: true,
    paranoid: true,
});

module.exports = UserAlipay;
