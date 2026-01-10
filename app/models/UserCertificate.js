const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const Certificate = require('./Certificate');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class UserCertificate extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

UserCertificate.init({
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
    certificate_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Certificate,
            key: 'id'
        },
        allowNull: false,
    },
    get_time: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    use_time: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'UserCertificate',
    tableName: 'user_certificates',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'certificate_id'],
        },
    ],
});

module.exports = UserCertificate;
