import { Role, RoleCreationAttributes } from "../models/Role";
import { CreateRoleDto, UpdateRoleDto } from "../dtos/role.dto";
import { ApiError } from "../utils/ApiError";

export const getAllRoles = async () => {
  return await Role.findAll({ where: { active: true } });
};

export const getRoleById = async (id: number) => {
  const role = await Role.findOne({ where: { id, active: true } });
  if (!role) {
    throw new ApiError("Role not found", 404);
  }
  return role;
};

export const createRole = async (data: CreateRoleDto) => {
  const roleData: RoleCreationAttributes = {
    role: data.role,
    active: true,
  };
  return await Role.create(roleData);
};

export const updateRole = async (id: number, data: UpdateRoleDto) => {
  const role = await Role.findOne({ where: { id, active: true } });
  if (!role) {
    throw new ApiError("Role not found", 404);
  }
  await role.update(data);
  return role;
};

export const deleteRole = async (id: number) => {
  const role = await Role.findOne({ where: { id, active: true } });
  if (!role) {
    throw new ApiError("Role not found", 404);
  }
  await role.update({ active: false });
  return { message: "Role disabled successfully" };
};