const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class UserKYC extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

UserKYC.init({
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
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true,
    },
    nrc_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    dob: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    nrc_number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    nrc_front_pic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    nrc_back_pic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    nrc_hold_pic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('NORMAL', 'PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'NORMAL',
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'UserKYC',
    tableName: 'user_kyc',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['relation'] },
    ]
});

module.exports = UserKYC;
