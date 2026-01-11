const { User, UserKYC, UserBonus, db } = require('./app/models');
const { Op } = require('sequelize');

const run = async () => {
    try {
        await User.update({ referral_bonus: 0 }, { where: {}});
        await UserBonus.destroy({ where: {} });

        const BATCH_SIZE = 1000;
        let lastId = 0;

        while (true) {

            const kycs = await UserKYC.findAll({
                attributes: ['id', 'relation', 'user_id', 'nrc_name'],
                where: { 
                    id: { [Op.gt]: lastId },
                },
                order: [['id', 'ASC']],
                limit: BATCH_SIZE
            });

            if (kycs.length === 0) break;
            lastId = kycs[kycs.length - 1].id;

            const t = await db.transaction();
            try {
                for (const kyc of kycs) {
                    const bonusArr = [10, 5, 1];
                    const relationArr = kyc.relation.split('/');
                    const upLevelIds = relationArr.length > 0 ? (relationArr.slice(1, relationArr.length - 1)).reverse().slice(0, 3) : [];
                    const bonuses = [];

                    await User.update({ name: kyc.nrc_name }, { where: { id: kyc.user_id }, transaction: t });

                    if (upLevelIds.length > 0) {
                        const upLevelUsers = await User.findAll({
                            where: {
                                id: { [Op.in]: upLevelIds }
                            },
                            attributes: ['id', 'relation', 'type'],
                            transaction: t,
                        });

                        for (let index = 0; index < upLevelIds.length; index++) {
                            const bonus = Number(bonusArr[index]);
                            if (bonus <= 0) {
                                continue;
                            }
                            const upLevelUser = upLevelUsers.find(u => u.id == upLevelIds[index]);
                            if (!upLevelUser || upLevelUser.type !== 2) { // only User type can get bonus
                                continue;
                            }
                            await upLevelUser.increment({ referral_bonus: bonus }, { transaction: t });
                            bonuses.push({
                                relation: upLevelUser.relation,
                                user_id: upLevelUser.id,
                                from_user_id: kyc.user_id,  
                                amount: bonus
                            });
                        }

                        if (bonuses.length > 0) {
                            await UserBonus.bulkCreate(bonuses, { transaction: t });
                        }
                    }
                }
                await t.commit();
                console.log(`Processed up to KYC ID: ${lastId}`);
            } catch (error) {
                await t.rollback();
                console.error('Transaction Error:', error);
            }

        } 

        await UserKYC.update({ status: 'APPROVED' }, { where: {} });
    } catch (error) {
        console.error(error);
    }
}

(() => {    
    run().then(() => {
        console.log('Referral bonus reset completed.');
        process.exit(0);
    }).catch(err => {
        console.error('Error in resetting referral bonus:', err);
        process.exit(1);
    });
})();