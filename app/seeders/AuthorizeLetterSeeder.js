const { AuthorizeLetter } = require('../models');
 
module.exports = async () => {
    const letters = [
        {
            id: 1,
            title: '中国授权书',
            content: '持有上合组织中国区授权书，可以提取100元共济基金至账户可提余额，及后续优先权益。',
            can_buy: 1,
            price: 120
        },
        {
            id: 2,
            title: '塔吉克斯坦授权书',
            content: '持有上合组织塔吉克斯坦区授权书，可获得个人黄金储备克数1000克，及后续优先权益。',
            can_buy: 1,
            price: 3000
        },
        {
            id: 3,
            title: '哈萨克斯坦授权书',
            content: '持有上合组织哈萨克斯坦区授权书，可获得个人黄金储备克数1000克，及后续优先权益。',
            can_buy: 1,
            price: 3000
        },
        {
            id: 4,
            title: '乌兹别克斯坦授权书',
            content: '持有上合组织乌兹别克斯坦区授权书，可获得个人黄金储备克数1000克，及后续优先权益。',
            can_buy: 1,
            price: 3000
        },
        {
            id: 5,
            title: '吉尔吉斯斯坦授权书',
            content: '持有上合组织吉尔吉斯斯坦区授权书，可获得个人黄金储备克数1000克，及后续优先权益。',
            can_buy: 1,
            price: 3000
        },
        {
            id: 6,
            title: '俄罗斯斯坦授权书',
            content: '暂未开放',
            can_buy: 0,
            price: 3000
        }
    ];

    const count = await AuthorizeLetter.count();
    if (count == 0) {
        await AuthorizeLetter.bulkCreate(letters);
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] AuthorizeLetterSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] AuthorizeLetter Data Exists.');
    }
}