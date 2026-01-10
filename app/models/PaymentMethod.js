const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class PaymentMethod extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

PaymentMethod.init({
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
        allowNull: false,
    },
    bank_card_number: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bank_card_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bank_card_phone_number: {
        type: DataTypes.STRING(11),
        allowNull: true,
    },
    open_bank_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    bank_card_pic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ali_account_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ali_account_number: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ali_qr_code_pic: {
        type: DataTypes.STRING,
        allowNull: true, // URL or file path
    },
    ali_home_page_screenshot: {
        type: DataTypes.STRING,
        allowNull: true, // URL or file path
    },
    bank_status: {
        type: DataTypes.ENUM('NORMAL', 'PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'NORMAL',
    },
    alipay_status: {
        type: DataTypes.ENUM('NORMAL', 'PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'NORMAL',
    },
    bank_remark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ali_remark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'PaymentMethod',
    tableName: 'user_payment_methods',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['relation'] },
    ]
});

module.exports = PaymentMethod;
