const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class Meeting extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        return attributes
    }
}

Meeting.init({
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
    cover: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    speaker: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    meeting_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    is_active: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
    },
}, {
    sequelize,
    modelName: 'Meeting',
    tableName: 'meetings',
    timestamps: true,
    paranoid: true,
});

module.exports = Meeting;
