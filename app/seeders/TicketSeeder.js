const { encrypt } = require('../helpers/AESHelper');
const { Ticket } = require('../models');
 

module.exports = async () => {
    const tickets = [
        {
            name: "上架上海四行仓库",
            price: 100
        },
        {
            name: "南京博物馆",
            price: 120
        },
        {
            name: "石家庄战役景点",
            price: 90
        },
        {
            name: "沈阳伪满洲皇言等抗战景点门票",
            price: 180
        },
    ];

    const count = await Ticket.count();
    if (count == 0) {
        await Ticket.bulkCreate(tickets);
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] TickerSeeder has been seeded successfully.');
    } else {
        console.log('\x1b[32m%s\x1b[0m', '[Seeder] Ticket Data Exists.');
    }
}