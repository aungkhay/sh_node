const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const Ticket = require('./Ticket');
const User = require('./User');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class TicketRecord extends Model { 
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        attributes.price = Number(attributes.price);
        return attributes
    }
}

TicketRecord.init({
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
        allowNull: false
    },
    ticket_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Ticket,
            key: 'id'
        },
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: '0.0'
    },
    status: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '0 => PENDING | 1 => APPROVED | 2 => DENIED'
    }
}, {
    sequelize,
    modelName: 'TicketRecord',
    tableName: 'ticket_records',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['relation'] },
    ]
});

module.exports = TicketRecord;
