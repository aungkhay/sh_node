const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class MasonicPackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.daily_earn)
            attributes.daily_earn = Number(attributes.daily_earn);
        if (attributes.masonic_fund)
            attributes.masonic_fund = Number(attributes.masonic_fund);

        return attributes
    }
}

MasonicPackage.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    product_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    daily_earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    masonic_fund: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // 1: 在售, 2: 下架 3: 售罄
    },
    cover_image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'MasonicPackage',
    tableName: 'masonic_packages',
    timestamps: true,
});

module.exports = MasonicPackage;
