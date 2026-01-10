const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class Role extends Model { 
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes;
    }
}

Role.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize,
    paranoid: true,
    timestamps: true,
    modelName: 'Role',
    tableName: 'roles'
})

module.exports = Role;