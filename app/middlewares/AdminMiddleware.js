const MyResponse = require('../helpers/MyResponse');
const RedisHelper = require('../helpers/RedisHelper');
const CommonHelper = require('../helpers/CommonHelper');

class MiddleWare {

    constructor (app) {
        this.commonHelper = new CommonHelper();
        this.redisHelper = new RedisHelper(app);
        this.ResCode = this.commonHelper.ResCode;
    }

    isLoggedIn = async (req, res, next) => {
        try {
            if(!req.header("authorization")) {
                return MyResponse(res, this.ResCode.UNAUTHORIZED.code, false, this.ResCode.UNAUTHORIZED.msg, {});
            }

            const token = this.commonHelper.formatToken(req.header("authorization"));
            const user = this.commonHelper.extractToken(token);
            if(!user || (user && user.type != 1)) {
                return MyResponse(res, this.ResCode.UNAUTHORIZED.code, false, this.ResCode.UNAUTHORIZED.msg, {});
            }

            const redisToken = await this.redisHelper.getValue(`admin_token_${user.id}_${user.login_count}`);
            if(!redisToken || (redisToken && redisToken != token)) {
                return MyResponse(res, this.ResCode.UNAUTHORIZED.code, false, this.ResCode.UNAUTHORIZED.msg, {});
            }

            await this.redisHelper.setValue(`admin_token_${user.id}_${user.login_count}`, token, 24 * 60 * 60);
            req.user_id = user.id;
            req.user_type = user.type;

            return next();
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = MiddleWare