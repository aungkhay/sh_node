const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const SCOInterbankPackage = require('./SCOInterbankPackage');

class SCOInterbankPackageHistory extends Model {
    toJSON() {
        let attributes = Object.assign({}, this.get())
        if (attributes.price)
            attributes.price = Number(attributes.price);
        if (attributes.verified_price)
            attributes.verified_price = Number(attributes.verified_price);
        return attributes
    }
}

SCOInterbankPackageHistory.init({
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
            model: SCOInterbankPackage,
            key: 'id'
        },
        defaultValue: 0
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '清验资金',
    },
    period: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '周期(天)',
    },
    verified_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '已清验资金',
    },
    will_finish_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '预计完成时间',
    },
    is_finished: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已完成',
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    remark: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    sequelize,
    modelName: 'SCOInterbankPackageHistory',
    tableName: 'sco_interbank_package_history',
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

module.exports = SCOInterbankPackageHistory
