const CryptoJS = require('crypto-js');

const API_KEY = process.env.API_KEY;
const API_IV = process.env.API_IV;
const PASS_KEY = process.env.PASS_KEY;
const PASS_IV = process.env.PASS_IV;
const PHONE_KEY = process.env.PHONE_KEY;
const PHONE_IV = process.env.PHONE_IV;

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

const decryptPass = (password) => {
    const decryted = decrypt(password, PASS_KEY, PASS_IV);
    return decryted.slice(10, -10);
}

const decryptPhone = (phone) => {
    const decryted = decrypt(phone, PHONE_KEY, PHONE_IV);
    return decryted.slice(10, -10);
}

const decryptReqBody = (data) => {
    const dec = decrypt(data, API_KEY, API_IV);
    return JSON.parse(dec || '{}');
}

const decryptReqQuery = (query) => {
    const dec = decrypt(query, API_KEY, API_IV);
    return JSON.parse(dec || '{}');
}

module.exports = {
    encrypt,
    decrypt,
    decryptPass,
    decryptPhone,
    decryptReqBody,
    decryptReqQuery
}