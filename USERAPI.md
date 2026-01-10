# User's API Documentation

### Base URL
``` js
const baseURL = 'http://127.0.0.1:2580/api';
```

### Response Format
``` json
{
    "code": 1000,
    "success": true,
    "message": "Success",
    "data": {}, // Object Or Array
    "errors": {} // When response code is 1002
}
```

### Request Data Sample
``` js
const url = `${baseURL}/endpoint`;
axios.post(url, {
    data: "encrypted data"
});
```

### Request Params Sample
``` js
const url = `${baseURL}/endpoint?data=${encryptedParams}`
// Example
axios.post(url, {
    params: {
        data: "encrypted params"
    }
})
```

### Authorization Header
``` json
{
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": "Berear {token}"
}
```

### AES
``` js
const encrypt = (phrase, KEY, IV) => {
    let key = CryptoJS.enc.Utf8.parse(KEY);
    let iv = CryptoJS.enc.Utf8.parse(IV);

    let srcs = CryptoJS.enc.Utf8.parse(phrase);
    const encrypted = CryptoJS.AES.encrypt(srcs, key, {
        iv: iv,
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });

    return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
}

const decrypt = (phrase, KEY, IV) => {
    let key = CryptoJS.enc.Utf8.parse(KEY)
    let iv = CryptoJS.enc.Utf8.parse(IV)

    let base64 = CryptoJS.enc.Base64.parse(phrase);
    let src = CryptoJS.enc.Base64.stringify(base64);

    const decrypt = CryptoJS.AES.decrypt(src, key, {
        iv: iv,
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });

    const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);

    return decryptedStr.toString();
}
```

### Recaptcha
``` js
// [GET]
const url = `${baseURL}/get-recaptcha`;
```

### Register
``` js
// [POST]
const url = `${baseURL}/register`;
const data = {
    phone: "13914736900",
    password: "Sai@1234",
    invite_code: "qwHJaOVLVpCDQ",
    uuid: "cab2d2b8-8439-47dd-b1f9-f25c0aee6842",
    verification_code: "c37MR"
}
```

### Login
``` js
// [POST]
const url = `${baseURL}/login`;
const data = {
    phone: "13914725800",
    password: "admin@123",
    uuid: "9aad0fd0-c564-433d-a960-dad75c7a2a3a",
    verification_code: "LwnxU"
}
```

### Server Time
``` js
// [GET]
const url = `${baseURL}/get-server-time`;
```

### OSS File Path
``` js
// [GET]
const url = `${baseURL}/get-file-path`;
```

### Customer Service
``` js
// [GET] 
const url = `${baseURL}/customer-service/${agentAppNo}`; // agentAppNo => 1 | 2 
```

### Profile
``` js
// [GET]
const url = `${baseURL}/profile`;
// reserve_fund [储备金]
// balance [余额]
// referral_bonus [推荐金]
// masonic_fund [共济基金]
// rank_allowance [军职津贴]
// earn [余额宝]

// [POST] Upload profile picture
const url = `${baseURL}/upload-profile-picture`;
const formData = new FormData();
formData.append('image', file, file.name.toLocaleLowerCase());
const config = {
    method: 'POST',
    maxBodyLength: Infinity,
    url: url,
    headers: {
        'Content-Type': 'multipart/form-data'
    },
    data: formData
}
await axios(config);

// [GET] Teams
const url = `${baseURL}/teams`;
const params = {
    page: 1,
    perPage: 10,
    level: 0, // 0 => All | 1 | 2 | 3 (max => 3)
}
```
### Logout
``` js
// [POST] 
const url = `${baseURL}/logout`;
```
### Modify Password
``` js
// [POST]
const url = `${baseURL}/modify-password`;
const data = {
    phone: "13914736900",
    old_password: "Sai@1234",
    new_password: "Tyler@123",
    nrc_last_six_digit: "456789",
    uuid: "21df063c-a1b2-4c87-baac-dcb13ec71a8b",
    verification_code: "4anL7"
}
```
### Forgot Password
``` js
// [POST]
const url = `${baseURL}/forgot-password`;
const data = {
    phone: "13914736900",
    nrc_number: "01234567890",
    new_password: "Tyler@123",
    uuid: "0c53f856-e5dd-485e-a362-8933b4423b07",
    verification_code: "Ck5jX"
}
```
### KYC
``` js
// [POST] Verify KYC
const url = `${baseURL}/kyc/verify`;
const data = {
    nrc_name: "AA",
    nrc_number: "0123456789",
    dob: "2000-10-29 14:00:00",
    nrc_front_pic: "", 
    nrc_back_pic: "", 
    nrc_hold_pic: ""
}

// [POST] KYC Sign URL
const url = `${baseURL}/kyc/get-kyc-sign-url`;
const data = {
    filename: '1768312345678.png',
    content_type: 'image/png'
}

// [POST] Upload KYC
const type = 'front | back | hold';
const url = `${baseURL}/kyc/${type}/upload`;
const formData = new FormData();
formData.append('image', file, file.name.toLocaleLowerCase());
const config = {
    method: 'POST',
    maxBodyLength: Infinity,
    url: url,
    headers: {
        'Content-Type': 'multipart/form-data'
    },
    data: formData
}
await axios(config);

// [GET] KYC Info
const url = `${baseURL}/kyc/info`;
```
### Payment Method
``` js
// [POST] Bind Bank and Alipay
const url = `${baseURL}/payment-method/bind`;
const data = {
    bank_card_number: "0123456789",
    bank_card_name: "AA",
    back_card_phone_number: "14725836900",
    open_bank_name: "AA",
    ali_account_name: "AA",
    ali_account_number: "13914725800",
    bank_card_pic: "", 
    ali_qr_code_pic: "", 
    ali_home_page_screenshot: ""
}

// [POST] Get payment Sign URL
const url = `${baseURL}/payment-method/get-sign-url`;
const data = {
    filename: '',
    content_type: ''
}

// [POST] Bind Bank
const url = `${baseURL}/payment-method/bind-bank`;
const data = {
    bank_card_number: "0123456789",
    bank_card_name: "AA",
    back_card_phone_number: "14725836900",
    open_bank_name: "AA",
    bank_card_pic: "", 
}

// [POST] Bind Alipay
const url = `${baseURL}/payment-method/bind-alipay`;
const data = {
    ali_account_name: "AA",
    ali_account_number: "13914725800",
    ali_qr_code_pic: "", 
    ali_home_page_screenshot: ""
}

// [POST] Upload
const type = 'bank_card_pic | ali_qr_code_pic | ali_home_page_screenshot';
const url = `${baseURL}/payment-method/${type}/upload`;
const formData = new FormData();
formData.append('image', file, file.name.toLocaleLowerCase());
const config = {
    method: 'POST',
    maxBodyLength: Infinity,
    url: url,
    headers: {
        'Content-Type': 'multipart/form-data'
    },
    data: formData
}
await axios(config);

// [GET] Payment method info
const url = `${baseURL}/payment-method/info`;
```
### Bind Address
``` js
// Regular Expression for validate address
const regEX = /^([\u4e00-\u9fa5]{1,10}省)?([\u4e00-\u9fa5]{1,10}市)?([\u4e00-\u9fa5]{1,10}(区|县))?([\u4e00-\u9fa5]{1,20}(街道|镇|乡|村))?\s*[\u4e00-\u9fa50-9\-号]*$/;

// [POST]
const url = `${baseURL}/bind-address`;
const data = {
    address: "-省-市-区-街道-号"
}
```

### Notification
``` js
// [GET] Notification List
const url = `${baseURL}/notifications`;
const params = {
    page: 1,
    perPage: 10,
    isRead: 0 // 0 => Unread | 1 => Read
}

// [GET] Detail
const url = `${baseURL}/notifications/${notiID}/details`;

// [POST] Read Notification
const url = `${baseURL}/notifications/{notiId}/mark-read`;
```
### News
``` js
// [GET]
const url = `${baseURL}/news`;
const params = {
    page: 1,
    perPage: 10,
    type: 0 // 0 => 全部 | 1 => 能量论坛 | 2 => 上合资讯 | 3 => 上合中心
}

// [GET] Detail
const url = `${baseURL}/news/${newsID}/details`;

// [POST] Get News Sign URL
const url = `${baseURL}/news/get-sign-url`;
const data = {
    filename: '',
    content_type: ''
}

// [POST] Upload [Image or Video]
const url = `${baseURL}/news/upload`;
const formData = new FormData();
formData.append('file', file, file.name.toLocaleLowerCase());
const config = {
    method: 'POST',
    maxBodyLength: Infinity,
    url: url,
    headers: {
        'Content-Type': 'multipart/form-data'
    },
    data: formData
}
await axios(config);

// [POST] Post News
const url = `${baseURL}/news/post`;
const data = {
    type: 1, // 1 => 能量论坛 | 2 => 上合资讯 | 3 => 上合中心
    title: '',
    content: '',
    file_url: ''
}

// [POST] Like News
const url = `${baseURL}/news/${newsID}/like`;

// [POST] Report News
const url = `${baseURL}/news/${newsID}/report`;
const data = {
    description: 'Some description ...'
}
```
### Certificate
``` js
// [GET] Certificate List 
const url = `${baseURL}/certificates`;
const params = {
    page: 1,
    perPage: 10
}

// [POST] Pick Certificate 
const url = `${baseURL}/certificates/{certID}/pick`;

// [POST] Use Certificate
const url = `${baseURL}/certificates/{certID}/use`;

// [GET] My Certificates
const url = `${baseURL}/my-certificates`;
const params = {
    page: 1,
    perPage: 10,
    historyTab: 1 // 1 => 未使用道具 | 2 => 使用历史
}
```
### Informations
``` js
// [GET] 素材列表
const url = `${baseURL}/informations`;
const params = {
    page: 1,
    perPage: 10
}
```
### Agreement
``` js
// [GET] Get Agreement html content
const url = `${baseURL}/get-digital-aggrement`;

// [POST]
const url = `${baseURL}/sign-agreement`;
```
### Welcome Message
``` js
// [GET] 
const url = `${baseURL}/get-welcome-message`;
```
### Envelop 红包雨
``` js
// [POST] Generate Envelop
const url = `${baseURL}/generate-red-envelop`;

// [GET] Get Envelop
const url = `${baseURL}/get-red-envelop`;
```
### Rank 军职列表
``` js
// [GET] Rank List
const url = `${baseURL}/ranks`;

// [POST] Request next rank
const url = `${baseURL}/request-next-rank`;
```
### Impeach 弹劾
``` js
// [POST]
const url = `${baseURL}/impeach-child`;
const data = {
    child_id: 3,
    impeach_type: 1, // 1 => 降薪 | 2 => 停职 | 3 => 封禁
    reason: "Some Reason"
}

// [GET] Impeach History
const url = `${baseURL}/impeach-history`;
const params = {
    page: 1,
    perPage: 10
}
```

### Allowance History 津贴记录
``` js
// [GET]
const url = `${baseURL}/allowance-history`;
const params = {
    page: 1,
    perPage: 10
}
```

### Ticket 兑换
``` js
// [GET] Ticket List
const url = `${baseURL}/ticket-list`;

// [POST] Buy Ticket using allowance
const url = `${baseURL}/allowance/${ticketID}/exchange`;

// [GET] My Tickets
const url = `${baseURL}/exchange-history`;
const params = {
    page: 1, 
    perPage: 10
}
```
### Inheritance 转让继承
``` js
// [POST]
const url = `${baseURL}/inherit-owner`;
const data = {
    inherit_account: 3,
    description: "Some Description"
}

// [POST]
const url = `${baseURL}/upload-inheritance-prove`;
const formData = new FormData();
formData.append('file', file, file.name.toLocaleLowerCase());
const config = {
    method: 'POST',
    maxBodyLength: Infinity,
    url: url,
    headers: {
        'Content-Type': 'multipart/form-data'
    },
    data: formData
}
await axios(config);
```
### Earn 余额宝
``` js
// [GET] Summary
const url = `${baseURL}/earn-summary`;

// [GET] History 
const url = `${baseURL}/earn-history`;
const params = {
    page: 1,
    perPage: 10
}
```
### Masonic Fund 共济基金
``` js
// [GET] 
const url = `${baseURL}/masonic-fund`;

// [POST] Get fund
const url = `${baseURL}/get-masonic-fund`;
```
### Transfer Wallet
``` js
// [POST] 余额 => 储备金
const url = `${baseURL}/transfer-balance-to-reserve-fund`;
const data = { amount: 100 }

// [GET] 推荐金提取券
const url = `${baseURL}/referral-bonus-coupons`;

// [POST] 推荐金 => 余额
// const url = `${baseURL}/transfer-referral-bonus-to-balance`;
// const data = { amount: 100 }
const url = `${baseURL}/transfer-referral-bonus-to-balance-by-coupon/${couponId}`;

// [POST] 推荐金 => 储备金
// const url = `${baseURL}/transfer-referral-bonus-to-reserve-fund`;
// const data = { amount: 100 }
const url = `${baseURL}/transfer-referral-bonus-to-reserve-fund-by-coupon/${couponId}`;

// [POST] 军职津贴 => 余额
const url = `${baseURL}/transfer-allowance-to-balance`;
const data = { amount: 100 }

// [POST] 余额 => 余额宝
const url = `${baseURL}/transfer-balance-to-earn`;
const data = { amount: 100 }

// [POST] 余额宝 => 余额
const url = `${baseURL}/transfer-earn-to-balance`;
const data = { amount: 100 }

// [POST] 黄金息 => 余额
const url = `${baseURL}/transfer-gold-interest-to-balance`;
const data = { amount: 100 }
```
### Deposit And Withdraw
``` js
// [POST] Deposit
const url = `${baseURL}/deposit`;
const data = {
    type: '1 => 微信, 2 => 支付宝, 3 => 云闪付, 4 => 银联',
    amount: 100
}

// [POST] Withdraw
const url = `${baseURL}/withdraw`;
const data = {
    amount: 100,
    withdrawBy: '', // 'BANK', 'ALIPAY'
}

// [GET] Deposit History
const url = `${baseURL}/deposit-history`;
const params = {
    page: 1,
    perPage: 10
}

// [GET] Withdraw History
const url = `${baseURL}/withdraw-history`;
const params = {
    page: 1,
    perPage: 10
}
```

### Gold Price
``` js
// [GET] Banners
const url = `${baseURL}/get-banners`;

// [GET] Gold Price History
const url = `${baseURL}/get-gold-price`;

// [POST] Buy Gold
const url = `${baseURL}/buy-gold`;
const data = {
    gold_count: 11 // in gram
}

// [POST] Sell Gold
const url = `${baseURL}/sell-gold`;
const data = {
    gold_count: 5 // in gram
}

// [POST] Exchange gold's coupon to gold
// const url = `${baseURL}/exchange-gold-coupon-to-gold`;
const url = `${baseURL}/gold-coupon/${couponId}/exchange-to-gold`;

// [POST] Exchange gold's coupon to balance
// const url = `${baseURL}/exchange-gold-coupon-to-balance`;
const url = `${baseURL}/gold-coupon/${couponId}/exchange-to-balance`;

// [GET] Buy Sell History
const url = `${baseURL}/buy-sell-gold-history`;
const params = {
    page: 1,
    perPage: 10,
    type: 0 // 0 => All | 1 => Buy | 2 => Sell
}

// [GET] Superior Internal Account
const url = `${baseURL}/superior-internal-account`;

// [GET] Gold Summary
const url = `${baseURL}/gold-summary`;

// [GET] Gold Coupon History
// const url = `${baseURL}/gold-coupon-history`;
const url = `${baseURL}/gold-coupon/history`;

// [GET] Gold interest history
const url = `${baseURL}/gold-interest-history`;
const params = {
    page: page,
    perPage: perPage
}

// [POST] Redemption Code
const url = `${baseURL}/redempt-code`;
const data = {
    code: ''
}

// [GET] Reward History
const url = `${baseURL}/reward-history`;
const params = {
    page: 1,
    perPage: 10
}
```