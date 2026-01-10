const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Role, Permission } = require('../../models');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
    }

    ROLES = async (req, res) => {
        try {
            const roles = await Role.findAll();
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', roles);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    PERMISSIONS = async (req, res) => {
        try {
            const permissions = await Permission.findAll();

            let model = null;
            let arr = [];
            let index = -1;
            let obj = {}

            for (let i = 0; i < permissions.length; i++) {
                const permission = permissions[i];
                const newObj = { id: permission.id, title: permission.title, name: permission.name };

                if (model == null || (model && permission.model != model)) {
                    obj = {}
                    obj.group = permission.model;
                    obj.permissions = [newObj];
                    model = obj.group;
                    index++;
                    obj.id = index + 1;
                    arr.push(obj);
                } else if (permission.model == model) {
                    arr[index].permissions.push(newObj);
                }
            }

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', arr);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ROLE_HAS_PERMISSIONS = async (req, res) => {
        try {
            const roleId = req.params.id;

            const role = await Role.findByPk(roleId);
            const permissions = (await role.getPermissions()).map(p => p.id);

            return MyResponse(res, this.ResCode.SUCCESS.code, true, '成功', permissions);
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;