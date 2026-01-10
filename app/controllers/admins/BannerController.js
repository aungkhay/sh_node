const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Banner } = require('../../models');
const { errLogger } = require('../../helpers/Logger');
const AliOSS = require('../../helpers/AliOSS');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

class Controller {
    constructor(app) {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
        this.getOffset = this.commonHelper.getOffset;
        this.OSS = new AliOSS();
    }

    INDEX = async (req, res) => {
        try {
            const page = parseInt(req.query.page || 1);
            const perPage = parseInt(req.query.perPage || 10);
            const offset = this.getOffset(page, perPage);

            const { rows, count } = await Banner.findAndCountAll({
                attributes: ['id', 'pic', 'createdAt', 'updatedAt'],
                order: [['createdAt', 'DESC']],
                limit: perPage,
                offset: offset
            });

            const data = {
                banners: rows,
                meta: {
                    page: page,
                    perPage: perPage,
                    totalPage: count > 0 ? Math.ceil(count / perPage) : count,
                    total: count
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', data);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPLOAD = async (req, res) => {
        try {
            req.uploadDir = `./uploads/banners`;

            const upload = require('../../middlewares/UploadImage');
            upload(req, res, async (err) => {
                if (err instanceof multer.MulterError) {
                    if (err.code == 'LIMIT_FILE_SIZE') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '文件过大', { allow_size: '5MB' });
                    }
                    if (err.code == 'ENOENT') {
                        return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, 'ENOENT', {});
                    }
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, err.message, {});
                } else if (err) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }

                if (req.file == null) {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '请选图片', {});
                }

                // Upload to AliOSS
                const dir = 'uploads/banners/';
                const fileName = req.file.filename;
                const localFile = path.resolve(__dirname, `../../../uploads/banners/${fileName}`);
                const { success } = await this.OSS.PUT(dir, fileName, localFile);
                if (success) {
                    await Banner.create({ pic: `/uploads/banners/${fileName}`, type: 'GOLD' });
                    return MyResponse(res, this.ResCode.SUCCESS.code, true, '上传成功', {});
                } else {
                    return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, '上传失败', {});
                }
            })
        } catch (error) {
            errLogger(`[Banner][UPLOAD]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE = async (req, res) => {
        try {
            const banner = await Banner.findByPk(req.params.id, { attributes: ['id', 'pic'] });
            if (!banner) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到信息', {});
            }

            // Delete File
            if(banner.pic != null) {
                const filePath = path.resolve(__dirname, `../../..${banner.pic}`);
                try {
                    const dir = 'uploads/banners/';
                    const image = banner.pic.split('/');
                    await this.OSS.DELETE(dir, image[3]);
                    fs.accessSync(filePath);
                    fs.unlinkSync(filePath, () => {
                        return commonHelper.MyResponse(res, resConfig.BAD_REQUEST, false, '删除失败！', {});
                    })
                } catch (err) {
                    console.log("DOES NOT exist:", filePath);
                }
            }

            await banner.destroy();

            // Log
            await this.adminLogger(req, 'Banner', 'delete');

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '删除成功', {});
        } catch (error) {
            errLogger(`[Banner][DELETE]: ${error.stack}`);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller