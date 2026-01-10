const MyResponse = require('../../helpers/MyResponse');
const CommonHelper = require('../../helpers/CommonHelper');
const { Role, Permission } = require('../../models');
let { validationResult } = require('express-validator');
const { Op } = require('sequelize');

class Controller {
    constructor() {
        this.commonHelper = new CommonHelper();
        this.ResCode = this.commonHelper.ResCode;
        this.adminLogger = this.commonHelper.adminLogger;
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

    CREATE_ROLE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const { code, name } = req.body;
            const roleCode = await Role.findOne({ where: { code } });
            if (roleCode) {
                const errMsg = [{ field: 'code', message: '角色代码已存在' }];
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, this.ResCode.BAD_REQUEST.msg, {}, errMsg);
            }
            const roleName = await Role.findOne({ where: { name } });
            if (roleName) {
                const errMsg = [{ field: 'name', message: '角色名称已存在' }];
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, this.ResCode.BAD_REQUEST.msg, {}, errMsg);
            }
            const newRole = await Role.create({ code, name });

            // Log
            await this.adminLogger(req, 'Role', 'create');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '角色创建成功', newRole);
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    UPDATE_ROLE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const roleId = req.params.id;
            const role = await Role.findByPk(roleId);
            if (!role) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到角色', {});
            }
            const { name } = req.body;
            const roleName = await Role.findOne({ where: { name, id: { [Op.ne]: roleId } } });
            if (roleName) {
                const errMsg = [{ field: 'name', message: '角色名称已存在' }];
                return MyResponse(res, this.ResCode.BAD_REQUEST.code, false, this.ResCode.BAD_REQUEST.msg, {}, errMsg);
            }
            await role.update({ name });

            // Log
            await this.adminLogger(req, 'Role', 'update');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '角色更新成功', {});
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    DELETE_ROLE = async (req, res) => {
        try {
            const roleId = req.params.id;
            const role = await Role.findByPk(roleId);
            if (!role) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到角色', {});
            }
            await role.destroy();
            // Log
            await this.adminLogger(req, 'Role', 'delete');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '角色删除成功', {});
        } catch (error) {
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }

    ASSIGN_PERMISSIONS_TO_ROLE = async (req, res) => {
        try {
            const err = validationResult(req);
            const errors = this.commonHelper.validateForm(err);
            if (!err.isEmpty()) {
                return MyResponse(res, this.ResCode.VALIDATE_FAIL.code, false, this.ResCode.VALIDATE_FAIL.msg, {}, errors);
            }
            const roleId = req.params.id;
            const role = await Role.findByPk(roleId);
            if (!role) {
                return MyResponse(res, this.ResCode.NOT_FOUND.code, false, '未找到角色', {});
            }
            const { permissionIds } = req.body;
            const validPermissions = await Permission.findAll({
                where: {
                    id: { [Op.in]: permissionIds }
                },
                attributes: ['id']
            });
            await role.setPermissions(validPermissions.map(p => p.id));
            // Log
            await this.adminLogger(req, 'Role', 'assign-permission');
            return MyResponse(res, this.ResCode.SUCCESS.code, true, '权限分配成功', {});
        } catch (error) {
            console.log(error);
            return MyResponse(res, this.ResCode.SERVER_ERROR.code, false, this.ResCode.SERVER_ERROR.msg, {});
        }
    }
}

module.exports = Controller;