const { Model, DataTypes } = require('sequelize');
const sequelize = require('../connections/Mysql');
const Rank = require('./Rank');

const PROTECTED_ATTRIBUTES = ['password', 'deletedAt'];
class User extends Model {
    toJSON() {
        // hide protected fields
        let attributes = Object.assign({}, this.get())
        for (let a of PROTECTED_ATTRIBUTES) {
            delete attributes[a]
        }
        if (attributes.reserve_fund !== undefined)
            attributes.reserve_fund = Number(attributes.reserve_fund);
        if (attributes.balance !== undefined)
            attributes.balance = Number(attributes.balance);
        if (attributes.referral_bonus !== undefined)
            attributes.referral_bonus = Number(attributes.referral_bonus);
        if (attributes.masonic_fund !== undefined)
            attributes.masonic_fund = Number(attributes.masonic_fund);
        if (attributes.rank_allowance !== undefined)
            attributes.rank_allowance = Number(attributes.rank_allowance);
        if (attributes.freeze_allowance !== undefined)
            attributes.freeze_allowance = Number(attributes.freeze_allowance);
        if (attributes.earn !== undefined)
            attributes.earn = Number(attributes.earn);
        if (attributes.gold !== undefined)
            attributes.gold = Number(attributes.gold);
        if (attributes.gold_interest !== undefined)
            attributes.gold_interest = Number(attributes.gold_interest);
        if (attributes.rank_point !== undefined)
            attributes.rank_point = Number(attributes.rank_point);
        if (attributes.level_up_pay !== undefined)
            attributes.level_up_pay = Number(attributes.level_up_pay);
        return attributes
    }
}

User.init({
    id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.INTEGER,
        defaultValue: '2',
        comment: '1 => Admin | 2 => User'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    serial_number: {
        type: DataTypes.STRING(14),
        allowNull: true,
    },
    top_account_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Top level account',
    },
    phone_number: {
        type: DataTypes.STRING(11),
        allowNull: false,
        unique: true,
        validate: {
            is: /^\d{11}$/,
        },
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    invite_code: {
        type: DataTypes.STRING(13),
        allowNull: false,
        unique: true,
    },
    parent_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'The user who invited this one',
    },
    relation: {
        type: DataTypes.STRING(333),
        allowNull: true,
        comment: 'Full invitation chain path',
    },
    reserve_fund: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '储备金'
    },
    balance: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '余额'
    },
    referral_bonus: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '推荐金'
    },
    masonic_fund: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 2000000,
        comment: '共济基金'
    },
    rank_allowance: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '军职津贴'
    },
    freeze_allowance: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '预压津贴'
    },
    earn: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '余额宝'
    },
    earn_out_limit: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '余额宝提现限额'
    },
    gold: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '黄金数'
    },
    gold_interest: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0,
        comment: '黄金利息'
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address_status: {
        type: DataTypes.ENUM('NORMAL', 'PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'NORMAL',
    },
    agreement_status: {
        type: DataTypes.ENUM('NORMAL', 'PENDING', 'APPROVED', 'DENIED'),
        allowNull: false,
        defaultValue: 'NORMAL',
    },
    rank_id: {
        type: DataTypes.BIGINT,
        references: {
            model: Rank,
            key: 'id'
        },
        defaultValue: 1
    },
    rank_point: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: 0,
        comment: '经验值'
    },
    level_up_pay: {
        type: DataTypes.DECIMAL(20, 8),
        defaultValue: 0,
        comment: '缴纳 100'
    },
    impeach_type: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '1 => 降薪 | 2 => 停职 | 3 => 封禁'
    },
    win_per_day: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    can_get_red_envelop: {
        type: DataTypes.TINYINT,
        defaultValue: 1,
        comment: '0 => Can not get | 1 => Can get (automatically set to 0 when limit is reached)'
    },
    status: {
        type: DataTypes.TINYINT,
        defaultValue: 1,
        comment: '0 => Disabled | 1 => Enabled'
    },
    political_vetting_status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'DENIED'),
        defaultValue: 'PENDING',
        comment: '政审状态'
    },
    is_internal_account: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
        comment: '1 => Internal Account 内部员工'
    },
    profile_picture: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isActive: {
        type: DataTypes.TINYINT,
        defaultValue: 0, // 0 => offlien | 1 => online
    },
    activedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    today_news_award_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Maximum reward per day: 2'
    },
    startEmployed: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Start record at rank id 3'
    },
    login_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    contact_info: {
        type: DataTypes.TEXT('medium'),
        allowNull: true,
    },
    google_2fa_secret: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    google_2fa_enabled: {
        type: DataTypes.TINYINT,
        defaultValue: 0,
    }
}, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    indexes: [
        {
            name: 'idx_relation',
            fields: ['relation'],
            using: 'BTREE',
        },
        {
            name: 'idx_is_active',
            fields: ['isActive'],
            using: 'BTREE',
        },
        {
            name: 'idx_actived_at',
            fields: ['activedAt'],
            using: 'BTREE',
        }
    ]
})

User.prototype.getParent = async function () {
    if (!this.parent_id) return null;
    return await User.findByPk(this.parent_id);
};

User.prototype.getChildren = async function () {
    return await User.findAll({
        where: { parent_id: this.id }
    });
};

module.exports = User;