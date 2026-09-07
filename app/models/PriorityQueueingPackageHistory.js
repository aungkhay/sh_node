const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const PriorityQueueingPackage = require('./PriorityQueueingPackage');

class PriorityQueueingPackageHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.queue_amount)
            attributes.queue_amount = Number(attributes.queue_amount);
        return attributes
    }
}

PriorityQueueingPackageHistory.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true
    },  
    user_id: {
        type: DataTypes.BIGINT,
        references: {
            model: User,
            key: 'id'
        },
        defaultValue: 0
    },
    package_id: {
        type: DataTypes.BIGINT,
        references: {
            model: PriorityQueueingPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '授权费',
    },
    queue_amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '优先排列',
    },
}, {
    sequelize,
    modelName: 'PriorityQueueingPackageHistory',
    tableName: 'priority_queueing_package_history',
    timestamps: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_createdAt',
            fields: ['createdAt'],
            using: 'BTREE'
        },
    ]
});

module.exports = PriorityQueueingPackageHistory
