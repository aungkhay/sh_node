# Admin's API Documentation

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

### Login
``` js
// [GET] Check account enable 2FA
const url = `${baseURL}/check-2fa-enabled?phone=${phoneNumber}`;

// [POST]
const url = `${baseURL}/login`;
const data = {
    phone: "13914736900",
    password: "Sai@1234",
    uuid: "cab2d2b8-8439-47dd-b1f9-f25c0aee6842",
    verification_code: "c37MR"
}
```
### OSS File Path
``` js
// [GET]
const url = `${baseURL}/get-file-path`;
```
### Profile
``` js
// [GET]
const url = `${baseURL}/profile`;
```
### Logout
``` js
// [POST] 
const url = `${baseURL}/logout`;
```

### Configurations
``` js
// [GET] Config List
const url = `${baseURL}/configs`;

// [POST] Update
const url = `${baseURL}/configs/${configID}/update`;
const data = {
    title: "Title",
    val: 3,
    description: "Description"
}
```

### Certificates
``` js
// [GET] List
const url = `${baseURL}/certificates`;
const params = {
    page: 1,
    perPage: 10,
    status: 0, // 0 => Disabled | | 1 => Enabled
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [POST] create
const url = `${baseURL}/certificates/create`;
const data = {
    title: "Cert Name",
    pic: ""
}

// [POST] Update
const url = `${baseURL}/certificates/${certID}/update`;
const data = {
    title: "Cert Name",
    pic: ""
}

// [POST] Switch Status
const url = `${baseURL}/certificates/${certID}/update-status`;
const data = {
    status: 0 // 0 => Disabled | 1 => Enabled
}

// [POST] Upload
const url = `${baseURL}/certificates/upload`;
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

// [POST] Delete
const url = `${baseURL}/certificates/${certID}/delete`;
```
### Deposit | Withdraw
``` js
// [GET] Deposit List
const url = `${baseURL}/deposit-list`;
const params = { 
    page: 1, 
    perPage: 10,
    phone: '',
    viewInferior: 0, // 1 => view all child
    status: 0, // 0 => PENDIGN | 1 => SUCCESS | 2 => FAILED
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [GET] Withdraw List
const url = `${baseURL}/withdraw-list`;
const params = { 
    page: 1, 
    perPage: 10,
    phone: '',
    viewInferior: 0, // 1 => view all child
    status: 0, // 0 => PENDIGN | 1 => SUCCESS | 2 => FAILED
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [GET] Export Withdraw
const url = `${baseURL}/export-withdraw`;
const params = {
    phone: '',
    viewInferior: 0, // 1 => view all child
    status: 0, // 0 => PENDIGN | 1 => SUCCESS | 2 => FAILED
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [POST] Import Withdraw
const url = `${baseURL}/import-withdraw`;
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
### Earn
``` js
// [GET] History
const url = `${baseURL}/earns`;
const params = { 
    page: 1, 
    perPage: 10,
    phone: '',
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}
```
### Impeachment 弹劾
``` js
// [GET] List
const url = `${baseURL}/impeaches`;
const params = { 
    page: 1, 
    perPage: 10,
    phone: '',
    type: 0, // 1 => 降薪 | 2 => 停职 | 3 => 封禁
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}

// [POST] Upldate
const url = `${baseURL}/impeaches/${impeachID}/update`;
const data = {
    status: "APPROVED" // DENIED
}
```
### Informations 素材列表
``` js
// [GET] List
const url = `${baseURL}/informations`;
const params = { 
    page: 1, 
    perPage: 10,
    status: 0, // 0 => Disabled | 1 => Enabled
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}

// [POST] Create
const url = `${baseURL}/informations/create`;
const data = {
    title: 'Information',
    content: 'HTML content',
    pic: ""
}

// [POST] Update
const url = `${baseURL}/informations/${infoID}/update`;
const data = {
    title: 'Information',
    content: 'HTML content',
    pic: ""
}

// [POST] Switch Status
const url = `${baseURL}/informations/${infoID}/update-status`;
const data = {
    status: 0 // 0 => Disabled | 1 => Enabled
}

// [POST] Upload
const url = `${baseURL}/informations/upload`;
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

// [POST] Delete
const url = `${baseURL}/informations/${infoID}/delete`;
```
### Inheritance 转入继承
``` js
// [GET] List
const url = `${baseURL}/inherits`;
const params = { 
    page: 1, 
    perPage: 10,
    status: '', // 'PENDING','APPROVED','DENIED'
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}

// [POST] Update
const url = `${baseURL}/inherits/${inheritID}/update`;
const data = {
    status: 'APPROVED' // DENIED
}
```
### 共济基金记录
``` js
// [GET] List
const url = `${baseURL}/masonic-fund-history`;
const params = { 
    page: 1, 
    perPage: 10,
    phone: '',
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}

// [POST] Substract Fund
const url = `${baseURL}/masonic-fund/substract`;
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

// [GET] Temp History
const url = `${baseURL}/masonic-fund/temp-history`;
const params = { 
    page: 1, 
    perPage: 10
}

// [POST] Update Status
const url = `${baseURL}/masonic-fund-history/${id}/update-status`;
const data = {
    status: 'APPROVED' // DENIED
}
```
### News
``` js
// [GET] Get OSS Sign
const url = `${baseURL}/oss/get-sign-url`;
const data = {
    id: 100,
    filename: '1768312345678.png',
    content_type: 'image/png'
}

// [GET] List
const url = `${baseURL}/news`;
const params = { 
    page: 1, 
    perPage: 10,
    type: 0, // 1 => 能量论坛 | 2 => 上合资讯 | 3 => 上合中心
    status: 0, // 0 => Disabled | 1 => Enabled
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}

// [POST] Create
const url = `${baseURL}/news/create`;
const data = {
    type: 1, // 1 => 能量论坛 | 2 => 上合资讯 | 3 => 上合中心
    title: 'Information',
    content: 'HTML content',
    pic: ""
}

// [POST] Update
const url = `${baseURL}/news/${newsID}/update`;
const data = {
    type: 2,
    title: 'Information',
    content: 'HTML content',
    pic: ""
}

// [POST] Update Status
const url = `${baseURL}/news/${newsID}/update-status`;
const data = {
    status: 'APPROVED' // DENIED
}

// [POST] Upload
const url = `${baseURL}/news/upload`;
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

// [POST] Delete
const url = `${baseURL}/news/${newsID}/delete`;

// [GET] Reported List
const url = `${baseURL}/news/reported-list`;
const params = {
    page: 1,
    perPage: 10,
    startTime: '',
    endTime: ''
}

// [POST] Update report status
const url = `${baseURL}/news-reports/:id/update-status`;
const data = {
    status: 'APPROVED' // DENIED
}
```
### Notifications
``` js
// [GET] List
const url = `${baseURL}/notifications`;
const params = { 
    page: 1, 
    perPage: 10,
    type: 0, // 1 => 平台公告 | 2 => 平台通知 | 3 => 站内信
    status: 0, // 0 => Disabled | 1 => Enabled
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}

// [POST] Create
const url = `${baseURL}/notifications/create`;
const data = {
    type: 1, // 1 => 平台公告 | 2 => 平台通知 | 3 => 站内信
    title: 'Information',
    content: 'HTML content'
}

// [POST] Update
const url = `${baseURL}/notifications/${notiId}/update`;
const data = {
    type: 2,
    title: 'Information',
    content: 'HTML content'
}

// [POST] Switch Status
const url = `${baseURL}/notifications/${notiId}/update-status`;
const data = {
    status: 0 // 0 => Disabled | 1 => Enabled
}

// [POST] Delete
const url = `${baseURL}/notifications/${notiId}/delete`;
```
### Ranks 军职列表
``` js
// [GET] Rank List
const url = `${baseURL}/ranks`;

// [POST] Update
const url = `${baseURL}/ranks/${rankID}/update`;
const data = {
    name: '', // optional
    number_of_impeach: 0, // can impeach count per month
    point: 1000, // 经验值
    allowance: 500, // 津贴
    allowance_rate: 98, // pay rate
    salary_rate: 50, // pay rate
    welcome_message: "Welcome"
}

// [POST] Upload
const url = `${baseURL}/ranks/${rankID}/upload`;
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
```
### Rewards
``` js
// [GET] Types
const url = `${baseURL}/reward-types`;

// [POST] Switch 是否能量论坛
const url = `${baseURL}/reward-types/${Id}/set-as-energy-forum`;
const data = {
    is_energy_forum: 1, // 0: 否, 1: 是
}

// [POST] Update
const url = `${baseURL}/reward-types/${typeID}/update`;
const data = {
    total_count: 0,
    remain_count: 0,
    range_min: 0, // random number range between 1 and 100
    range_max: 0,
    amount_min: 0, // optional
    amount_max: 0, // optional
}

// [POST] Update Status
const url = `${baseURL}/reward-types/${typeID}/update-status`;
const data = {
    status: 0, // 0: 禁用, 1: 启用
}

// [GET] History
const url = `${baseURL}/reward-history`;
const params = { 
    page: 1, 
    perPage: 10,
    phone: '',
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}

// Referral Reward Setting
// [GET] List
const url = `${baseURL}/referral-reward-settings`;

// [POST] Create
const url = `${baseURL}/referral-reward-settings/create`;
const data = {
    name: '10% coupon',
    amount: 10,
    total_count: 1000
}

// [POST] Update
const url = `${baseURL}/referral-reward-settings/${id}/update`;
const data = {
    name: '10% coupon',
    amount: 10,
    total_count: 1000
}

// [POST] Delete
const url = `${baseURL}/referral-reward-settings/${id}/delete`;
```
### Tickets
``` js
// [GET] List
const url = `${baseURL}/tickets`;

// [POST] Update
const url = `${baseURL}/tickets/${ticketID}/update`;
const data = { price: 100 }

// [GET] History
const url = `${baseURL}/ticket-history`;
const params = { 
    page: 1, 
    perPage: 10,
    status: 0, // 0 => PENDING | 1 => APPROVED | 2 => DENIED
    phone: '',
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59', 
}
```

### Wallet's Transfer
``` js
// [GET]
const url = `${baseURL}/transfers`;
const params = { 
    page: 1, 
    perPage: 10,
    walletType: 0,
    phone: '',
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',  
}
// wallet_type 
// 1 => 储备金 | 2 => 余额 | 3 => 推荐金 | 4 => 共济基金 | 5 => 军职津贴 | 6 => 预压津贴 | 7 => 余额宝 | 8 => 黄金息 | 9 => 缴纳保证金
// status => NORMAL,PENDING,APPROVED,DENIED

// [POST] Update Status
const url = `${baseURL}/transfer/${transferID}/update-status`;
const data = {
    status: 'APPROVED' // 'DENIED'
}
```

### User
``` js
// [GET] User List
const url = `${baseURL}/users`;
const params = {
    page: 1,
    perPage: 10,
    type: 1, // 1 => Admin | 2 => User
    phone: "13914725800",
    status: 0, // 0 => Disbaled | 1 => Enabled
    isInternalAccount: 0, // 0 => No | 1 => No
    politicalVettingStatus: '', // 政审状态 'PENDING','APPROVED','DENIED'
    viewChild: 0, // 1 => Adjacent Child | 2 => All Child
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [GET] KYC List
const url = `${baseURL}/kyc-list`;
const params = {
    page: 1,
    perPage: 10,
    phone: "13914725800",
    status: "NORMAL", // 'NORMAL','PENDING','APPROVED','DENIED'
    nrc_name: "",
    nrc_number: "",
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [GET] Payment methods
const url = `${baseURL}/payment-methods`;
const params = {
    page: 1,
    perPage: 10,
    phone: "13914725800",
    bank_status: "", // 'NORMAL','PENDING','APPROVED','DENIED'
    alipay_status: "", // 'NORMAL','PENDING','APPROVED','DENIED'
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [POST] Update Bank
const url = `${baseURL}/payment-methods/${$Id}/update-bank`;
const data = {
    bank_card_number: '', // 银行卡号
    bank_card_name: '', // 开户姓名
    bank_card_phone_number: '', // 预留手机号
    open_bank_name: '', // 开户银行
}

// [POST] Update Alipay
const url = `${baseURL}/payment-methods/${Id}/update-alipay`;
const data = {
    ali_account_name: '',
    ali_account_number: ''
}

// [GET] User's Certificate
const url = `${baseURL}/user-certificates`;
const params = {
    page: 1,
    perPage: 10,
    phone: "",
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [GET] User's Bonuses
const url = `${baseURL}/user-bonuses`;
const params = {
    page: 1,
    perPage: 10,
    phone: "",
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [GET] User's Rank Points
const url = `${baseURL}/user-rank-points`;
const params = {
    page: 1,
    perPage: 10,
    phone: "",
    startTime: '2025-11-06 00:00:00',
    endTime: '2025-11-06 23:59:59',
}

// [POST] Switch User's Status
const url = `${baseURL}/users/${userID}/update-status`;
const data = {
    status: 0, // 0 => Disabled | 1 => Enabled
    // disabled_all_child: 1, // only for status 0,
    effected_to_all_child: 1,
}

// [POST] Delete KYC
const url = `${baseURL}/kyc/${Id}/delete-kyc`;

// [POST] Update KYC status
const url = `${baseURL}/kyc/${kycID}/update-kyc-status`;
const data = {
    status: "APPROVED" // DENIED
}

// [POST] APPROVED multiple
const url = `${baseURL}/kyc/approved-multiple`;
const data = {
    ids: [1,2,3]
}

// [POST] DENIED multiple
const url = `${baseURL}/kyc/denied-multiple`;
const data = {
    ids: [1,2,3]
}

// [POST] Update KYC
const url = `${baseURL}/kyc/${kycID}/update-kyc`;
const data = {
    nrc_name: '',
    nrc_number: '',
}

// [POST] Update bank status
const url = `${baseURL}/payment-methods/${methodID}/update-bank-status`;
const data = {
    status: "APPROVED" // DENIED
}

// [POST] Update Alipay Status
const url = `${baseURL}/payment-methods/${methodID}/update-alipay-status`;
const data = {
    status: "APPROVED" // DENIED
}

// [POST] 可白名单设置用户中奖次数
const url = `${baseURL}/users/${userID}/set-win-whitelist`;
const data = {
    win_per_day: 0
}

// [POST] 修改密码
const url = `${baseURL}/users/${userID}/change-password`;
const data = {
    // login_password: '',
    password: '' // 密码至少需要8个字符
}

// [POST] Update Agreement Status
const url = `${baseURL}/users/${userID}/update-agreement-status`;
const data = {
    agreement_status: '' // APPROVED, DENIED
}

// [POST] Update Agreement Status 政审状态
const url = `${baseURL}/users/${userID}/update-political-vetting-status`;
const data = {
    political_vetting_status: '' // APPROVED, DENIED
}

// [POST] Set to internal Account
const url = `${baseURL}/users/${userID}/set-to-internal-account`;

// [GET] Child Summary
const url = `${baseURL}/users/child-summary`;
const params = {
    phone: '',
    startTime: '',
    endTime: ''
}

// [GET] 
const url = `${baseURL}/users/${userID}/superior-internal-account`;

// [GET] Allowance history
const url = `${baseURL}/users/allowance-history`;
const params = {
    page: 1,
    perPage: 10,
    startTime: '',
    endTime: '',
    phone: ''
}

// [GET] 汇总，点击注册总数
const url = `${baseURL}/users/child-register-list`;
const params = {
    page: 1,
    perPage: 10,
    phone: ''
}

// [POST] 上下分
const url = `${baseURL}/users/${userId}/update-wallet`;
const data = {
    walletType: 1, // 1 => 储备金 | 2 => 余额 | 3 => 推荐金
    addOrSubstract: 1, // 1 => add | 2 => substract
    amount: 100
}

// [POST] Update Contact Info
const url = `${baseURL}/users/${userId}/update-contact-info`;
const data = {
    contact_info: ''
}

// [POST] Setup 2FA
const url = `${baseURL}/users/${userId}/setup-2fa`;
const data = {
    email: ''
}

// [POST] Enable 2FA
const url = `${baseURL}/users/${userId}/enable-2fa`;
const data = {
    token: '' // google 6 digit OTP
}

// [POST] Disable 2FA
const url = `${baseURL}/users/${userId}/disable-2fa`;
const data = {
    token: '' // google 6 digit OTP
}

// [GET] Find User by phone
const url = `${baseURL}/users/find-user-by-phone?phone=${phoneNumber}`;

// [POST] Upload KYC
const type = 'front | back | hold';
const url = `${baseURL}/users/${userId}/upload-kyc/${type}`;
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

// [POST] Add KYC
const url = `${baseURL}/users/${userId}/add-kyc`;
const data = {
    nrc_name: "AA",
    nrc_number: "0123456789",
    nrc_front_pic: "", 
    nrc_back_pic: "", 
    nrc_hold_pic: ""
}
```
### Logs 操作日志
``` js
// [GET]
const url = `${baseURL}/logs`;
const params = {
    page: 1,
    perPage: 10,
    type: '',
    model: '',
    admin_phone: ''
}
// type => login, create, update, delete
// model
// User => 用户
// Config => 配置
// Certifcate => 道具
// Information => 素材列表
// InheritOwner => 转让继承
// News => 新闻
// Notification => 消息
// Rank => 军职列表
// Reward => 奖品
// Ticket => 门票
// PaymentMethod => 用户支付方式
// UserKYC => 用户实名认证
```

### Gold
``` js
// [GET] Price changes percentage
const url = `${baseURL}/gold-prices/changes-percentage`;

// [POST] Update changes percentage
const url = `${baseURL}/gold-prices/update-changes-percentage`;
const data = {
    percentage: 2, // min: 0 | max: 100
}

// [GET] Gold Price History
const url = `${baseURL}/gold-prices/history`;
const params = { page: 1, perPage: 10 }

// [POST] Update reserve price
const url = `${baseURL}/gold-prices/${priceID}/update`;
const data = { reserve_price: 906.15 }

// [GET] Buy/Sell records
const url = `${baseURL}/gold-prices/user-buy-sell-records`;
const params = {
    page: 1,
    perPage: 10,
    type: 0, // 0 => All | 1 => Buy | 2 => Sell
    phone: ''
}

// [GET] Gold Interest
const url = `${baseURL}/gold-prices/interest-records`;
const params = {
    page: 1,
    perPage: 10,
    phone: '',
    startTime: '',
    endTime: ''
}
```
### Banner
``` js
// [GET] List
const url = `${baseURL}/banners`;
const params = { page: 1, perPage: 10 }

// [POST] Upload
const url = `${baseURL}/banners/${bannerID}/upload`;
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

// [POST] Delete
const url = `${baseURL}/banners/${bannerID}/delete`;
```
### Dashboard
``` js
// [GET] Summary
const url = `${baseURL}/dashboard/summary`;

// [GET] DW Chart
const url = `${baseURL}/dashboard/dw-chart`;

// [GET] Recent DW List
const url = `${baseURL}/recent-dw-list`;
```

### Redempt Code
``` js
// [GET] List
const url = `${baseURL}/redempt-codes`;
const params = {
    page: 1,
    perPage: 10,
    phone: '',
    is_used: 0, // 0 => Not used | 1 => Used
    startTime: '',
    endTime: ''
}

// [POST] Create
const url = `${baseURL}/redempt-codes/create`;
const {
    type: 1, // 1 => 共济基金增加 | 2 => 共济基金发放 | 3 => 经验值增加 | 4 => 黄金券发放
    redempt_code: '',
    phone: '',
    amount: ''
}
```
### Merchant
``` js
// [GET] List
const url = `${baseURL}/merchants`;

// [POST] Update status
const url = `${baseURL}/merchants/${merchantId}/change-status`;
const data = {
    status: 1 // 0 => Disabled | 1 => Enabled
}
```