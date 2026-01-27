require('dotenv').config({ path: `./.env` });
const { encrypt, decrypt } = require('./app/helpers/AESHelper');

const API_KEY = process.env.API_KEY;
const API_IV = process.env.API_IV;

const startEncrypt = () => {
    const registerData = JSON.stringify({
        phone: "13900000001",
        password: "Sai@1234",
        invite_code: "545645452111",
        uuid: "215ead1a-844e-448b-be06-b4dabe652502",
        verification_code: "37105"
    });

    const loginData = JSON.stringify({
        phone: "13914725800",
        password: "superadmin@123",
        uuid: "b5afa324-c063-42c9-856b-5b51c1192ec7",
        verification_code: "15855"
    });

    const kyc = JSON.stringify({
        nrc_name: '龚桂英',
        nrc_number: '510321197806301583',
        nrc_front_pic: '/uploads/kyc/76/front-1767712051252.png',
        nrc_back_pic: '/uploads/kyc/76/back-1767712051252.png',
        nrc_hold_pic: '/uploads/kyc/76/hold-1767712051252.png',
    })
    const kycStatus = JSON.stringify({ status: 'APPROVED' });

    const payment_method = JSON.stringify({
        bank_card_number: '1234567890',
        bank_card_name: 'Tyler',
        bank_card_phone_number: '09123456789',
        open_bank_name: 'AYA',
        ali_account_name: 'Tyler',
        ali_account_number: 'tyler005',
    })

    const address = JSON.stringify({ address: 'United State of America' });

    const modify_password = JSON.stringify({
        phone: "13914736900",
        old_password: "Sai@1234",
        new_password: "Tyler@123",
        uuid: "21df063c-a1b2-4c87-baac-dcb13ec71a8b",
        verification_code: "4anL7"
    });

    const forgot_password = JSON.stringify({
        phone: "13914736900",
        nrc_number: "01234567890",
        new_password: "Tyler@123",
        uuid: "0c53f856-e5dd-485e-a362-8933b4423b07",
        verification_code: "Ck5jX"
    });

    const transfer = JSON.stringify({ amount: 90 });

    const impeach = JSON.stringify({
        child_id: 7,
        impeach_type: 2,
        reason: 'Some reason'
    });

    const inherit = JSON.stringify({
        inherit_account: "13914725800",
        description: "-----"
    })

    const config = JSON.stringify({
        title: 'User wining per day',
        val: 3,
        description: 'User wining per day'
    })

    const certificate = JSON.stringify({
        title: 'Certificate 1 ...'
    })

    const status = JSON.stringify({ status: 0 });
    const impeachStatus = JSON.stringify({ status: 'DENIED' });
    const info = JSON.stringify({ title: "Su Chai ...", content: "<p>Hellow World!</p>" });
    const news = JSON.stringify({
        type: 1,
        title: 'News',
        subtitle: 'Subtitle',
        content: '<p>Hello world!</p>',
        file_url: '/uploads/news/2_1763011306316.png'
    })
    const rank = JSON.stringify({
        number_of_impeach: 1,
        point: 0,
        allowance: 0,
        allowance_rate: 98,
        salary_rate: 50
    })

    const reward = JSON.stringify({
        range_min: 1, 
        range_max: 5,
        amount_min: 5000,
        amount_max: 15000
    })

    const ticket = JSON.stringify({
        price: 100
    })

    const winWhiteList = JSON.stringify({ win_per_day: 5 });
    const changePasword = JSON.stringify({
        login_password: "admin@123",
        password: "Sai@1234"
    })
    const buyGold = JSON.stringify({ gold_count: 1 });

    const updateGoldPrice = JSON.stringify({ reserve_price: 907 });
    const updateAgreementStatus = JSON.stringify({ political_vetting_status: 'APPROVED' });
    const filters = JSON.stringify({
        page: 1,
        perPage: 5,
    })
    const gold_percentage = JSON.stringify({ rate: 0.2, percentage: 0.05 });
    const reportNews = JSON.stringify({ description: 'HaHa Blah' });
    const redemptCode = JSON.stringify({ phone: '13914725811', amount: 500 });
    const getRedemptCode = JSON.stringify({ code: '8416385750814066' });
    const depositData = JSON.stringify({
        type: 2,
        amount: 1000
    })
    const updateWallet = JSON.stringify({
        walletType: 3,
        addOrSubstract: 2,
        amount: 100
    })
    const withdraw = JSON.stringify({
        amount: 100,
        withdrawBy: 'ALIPAY'
    })
    const contactInfo = JSON.stringify({
        contact_info: "Email: "
    });
    const referralRewardSetting = JSON.stringify({
        name: '20% coupon',
        amount: 20,
        total_count: 1000
    });
    const kycIds = JSON.stringify({ ids: [36,37,38,57] });
    const ossSignData = JSON.stringify({
        id: 100,
        filename: '1768312345678.png',
        content_type: 'image/png'
    });
    const setup2FAData = JSON.stringify({
        email: ""
    });
    const verify2FAData = JSON.stringify({
        token: "488186"
    });
    const createRole = JSON.stringify({
        code: "test",
        name: "Test"
    });
    const updateRole = JSON.stringify({
        name: "超级管理员"
    });
    const permissions = JSON.stringify({
        permissionIds: [1,2]
    })
    const roleIds = JSON.stringify({
        roleIds: [4,5,6]
    })
    const addReward = JSON.stringify({
        // user_id: 34,
        is_all_user: 1,
        reward_id: 1,
        amount: 111
    });
    const deleteMultitpleRewards = JSON.stringify({ ids: [114011,114010] });
    const exportWithdraw = JSON.stringify({
        phone_numbers: []
    })
    const encrypted = encrypt(filters, API_KEY, API_IV);
    console.log(encrypted);
}

const startDecrypt = () => {
    const phrase = "/WOCEIGc8oD57JIoXjCpeo2qQF9sSLkLRlR1vbWB0cW61Y7cR4VJaQZ8XjIUkDFQG9iIODIjbyx7nv871lXhjDCelIpeLbwXBZkZIBkgko90yTCltfNIcG7oSZ1UCTa+C08dSZq+6sQg9e+JBDYqw0JvK95HnrSGSNceKmoL01h3OsqqO+2zHnbHzaHndhcX"
    const decrypted = decrypt(phrase, API_KEY, API_IV);
    console.log(decrypted);
}
(async () => {
    await startEncrypt();
    process.exit();
})();
