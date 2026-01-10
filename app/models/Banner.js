const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class Banner extends Model {}

Banner.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.ENUM('GOLD'),
        allowNull: false,
    },
    pic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'Banner',
    tableName: 'banners',
    timestamps: true,
});

module.exports = Banner;