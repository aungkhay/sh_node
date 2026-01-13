const { encrypt } = require('./AESHelper');
const API_KEY = process.env.API_KEY;
const API_IV = process.env.API_IV;

module.exports = (res, code, success, message, data, errors = null) => {
    const encData = {
        code: code,
        success: success,
        message: message,
        data: data,
        errors: errors ?? {}
    }

    console.log(process.env.ENCRYPTION_ENABLED)
    if (Number(process.env.ENCRYPTION_ENABLED || 1) == 0) {
        return res.status(200).json(encData);
    }
    const response = encrypt(JSON.stringify(encData), API_KEY, API_IV);
    return res.status(200).json(response);
}