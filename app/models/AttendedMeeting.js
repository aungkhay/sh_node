const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const User = require('./User');
const Meeting = require('./Meeting');

const PROTECTED_ATTRIBUTES = ['deletedAt'];
class AttendedMeeting extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        if (attributes.reward_amount !== undefined)
            attributes.reward_amount = Number(attributes.reward_amount);
        return attributes
    }
}

AttendedMeeting.init({
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
    meeting_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Meeting,
            key: 'id'
        },
        allowNull: false,
    },
    meeting_code: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    reward_amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
        comment: 'Reward amount for attending the meeting'
    }
}, {
    sequelize,
    modelName: 'AttendedMeeting',
    tableName: 'attended_meetings',
    timestamps: true,
    paranoid: true,
    indexes: [
        { fields: ['relation'] },
        { fields: ['meeting_id'] },
        { fields: ['user_id'] },
        { fields: ['meeting_code'] },
    ]
});

module.exports = AttendedMeeting;
