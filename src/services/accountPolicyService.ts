import { Op, Transaction } from "sequelize";
import { Category } from "../models/Category";
import { Item } from "../models/Item";
import { Menu } from "../models/Menu";
import { Role } from "../models/Role";
import { User } from "../models/User";
import {
  AccountEntitlements,
  FREE_ROLE_NAME,
  assertCategoryCreationWithinPlan,
  assertImageMutationWithinPlan,
  assertItemCreationWithinPlan,
  assertMenuCreationWithinPlan,
  entitlementsForRoleName,
  isClientRoleName,
  planFromRoleName,
} from "../policies/accountPolicy";
import { ApiError } from "../utils/ApiError";

async function findUserForPolicy(
  userId: number,
  transaction?: Transaction,
  lock = false
) {
  const user = await User.unscoped().findByPk(userId, {
    transaction,
    ...(transaction && lock ? { lock: transaction.LOCK.UPDATE } : {}),
  });

  if (!user || !user.active) {
    throw new ApiError("Usuario no encontrado o inactivo", 403);
  }

  return user;
}

async function roleForPolicy(
  roleId: number,
  transaction?: Transaction
): Promise<Role> {
  const role = await Role.findByPk(roleId, { transaction });
  if (!role || !role.active) {
    throw new ApiError("Rol de usuario no encontrado o inactivo", 403);
  }
  return role;
}

export async function getAccountEntitlements(
  userId: number,
  transaction?: Transaction
): Promise<AccountEntitlements> {
  const authorization = await getAccountAuthorization(userId, transaction);
  return authorization.account;
}

export async function getAccountAuthorization(
  userId: number,
  transaction?: Transaction
) {
  const user = await findUserForPolicy(userId, transaction);
  const role = await roleForPolicy(user.roleId, transaction);

  return {
    role: role.role,
    account: entitlementsForRoleName(role.role),
  };
}

export async function getOrCreateFreeRole(transaction?: Transaction) {
  const [role] = await Role.findOrCreate({
    where: { role: FREE_ROLE_NAME },
    defaults: { role: FREE_ROLE_NAME, active: true },
    transaction,
  });

  if (!role.active) {
    await role.update({ active: true }, { transaction });
  }

  return role;
}

export async function assertCanCreateMenu(
  userId: number,
  transaction: Transaction
) {
  const user = await findUserForPolicy(userId, transaction, true);
  const role = await roleForPolicy(user.roleId, transaction);
  const plan = planFromRoleName(role.role);
  if (plan !== "free" && !isClientRoleName(role.role)) return plan;

  const existingMenus = await Menu.count({
    where: { userId, active: true },
    transaction,
  });
  assertMenuCreationWithinPlan(plan, existingMenus);
  return plan;
}

export async function assertCanActivateMenu(
  userId: number,
  menuId: number,
  transaction: Transaction
) {
  const user = await findUserForPolicy(userId, transaction, true);
  const role = await roleForPolicy(user.roleId, transaction);
  const plan = planFromRoleName(role.role);
  if (plan !== "free" && !isClientRoleName(role.role)) return;

  const otherActiveMenus = await Menu.count({
    where: {
      userId,
      active: true,
      id: { [Op.ne]: menuId },
    },
    transaction,
  });
  assertMenuCreationWithinPlan(plan, otherActiveMenus);
}

export async function assertCanCreateCategories(
  userId: number,
  menuId: number,
  requestedCategories: number,
  transaction: Transaction
) {
  if (requestedCategories <= 0) return;

  const user = await findUserForPolicy(userId, transaction, true);
  const role = await roleForPolicy(user.roleId, transaction);
  const plan = planFromRoleName(role.role);
  if (plan !== "free") return;

  const existingCategories = await Category.count({
    where: { menuId },
    transaction,
  });
  assertCategoryCreationWithinPlan(
    plan,
    existingCategories,
    requestedCategories
  );
}

export async function assertCanCreateItems(
  userId: number,
  menuId: number,
  requestedItems: number,
  transaction: Transaction
) {
  const user = await findUserForPolicy(userId, transaction, true);
  const role = await roleForPolicy(user.roleId, transaction);
  const plan = planFromRoleName(role.role);
  if (plan !== "free") return;

  const categories = await Category.findAll({
    where: { menuId },
    attributes: ["id"],
    transaction,
  });
  const categoryIds = categories.map((category) => category.id);
  const existingItems = categoryIds.length
    ? await Item.count({
        where: { categoryId: { [Op.in]: categoryIds } },
        transaction,
      })
    : 0;

  assertItemCreationWithinPlan(plan, existingItems, requestedItems);
}

export async function assertCanMutateImages(
  userId: number,
  hasImageMutation: boolean,
  transaction?: Transaction
) {
  if (!hasImageMutation) return;
  const user = await findUserForPolicy(userId, transaction);
  const role = await roleForPolicy(user.roleId, transaction);
  const plan = planFromRoleName(role.role);
  assertImageMutationWithinPlan(plan, hasImageMutation);
}
