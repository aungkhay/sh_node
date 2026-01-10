const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class Information extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

Information.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
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
    pic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: DataTypes.TINYINT,
        defaultValue: '0',
        comment: '0 => Disabled | 1 => Enabled'
    },
}, {
    sequelize,
    modelName: 'Information',
    tableName: 'informations',
    timestamps: true,
});

module.exports = Information;
