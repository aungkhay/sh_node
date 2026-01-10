const OSS = require('ali-oss');

const ACCESS_KEY_ID = process.env.ALIOSS_ACCESS_KEY_ID;
const ACCESS_KEY_SECRET = process.env.ALIOSS_ACCESS_KEY_SECRET;

class AliOSS {
    constructor() {
        this.client = new OSS({
            region: 'oss-cn-hongkong',
            accessKeyId: process.env.ALIOSS_ACCESS_KEY_ID,
            accessKeySecret: process.env.ALIOSS_ACCESS_KEY_SECRET,
            bucket: 'chinamainland',
            endpoint: 'oss-cn-hongkong.aliyuncs.com'
        });
    }

    PUT = async (dir, filename, filePath) => {
        try {
            const result = await this.client.put(dir + filename, filePath);
            return { success: true, result: result };

        } catch (error) {
            return { success: false, result: error };
        }
    }

    DELETE = async (dir, filename) => {
        try {

            const result = await this.client.delete(dir + filename);
            return { success: true, result: result };

        } catch (error) {
            return { success: false, result: error };
        }
    }

    SIGN_URL = async (filename, contentType) => {
        try {
            const url = await this.client.signatureUrl(filename, {
                expires: 3600,
                method: 'PUT',
                'Content-Type': contentType
            });
            return url;
        } catch (error) {
            return null;
        }
    }
}

module.exports = AliOSS