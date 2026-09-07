const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');

class PriorityQueueingPackage extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
                attributes.price = Number(attributes.price);
        if (attributes.queue_amount)
            attributes.queue_amount = Number(attributes.queue_amount);
        
        return attributes
    }
}

PriorityQueueingPackage.init({
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
        comment: '申请费',
    },
    queue_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '优先排列',
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '状态: 1-在售, 2-下架, 3-售罄',
    }
}, {
    sequelize,
    modelName: 'PriorityQueueingPackage',
    tableName: 'priority_queueing_packages',
    timestamps: true,
});

module.exports = PriorityQueueingPackage;
