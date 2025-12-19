import { Request, Response, NextFunction } from "express";
import * as roleService from "../services/roleService";
import { RequestLogger } from "../utils/requestLogger";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "unknown";

export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    reqLogger.info("Listing roles");
    const roles = await roleService.getAllRoles();
    reqLogger.info("Roles listed", { count: roles.length });
    res.json(roles);
  } catch (error) {
    reqLogger.error("Failed to list roles", { error: errorMessage(error) });
    next(error);
  }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseInt(req.params.id);
    reqLogger.info("Fetching role", { roleId: id });
    const role = await roleService.getRoleById(id);
    reqLogger.info("Role fetched", { roleId: id });
    res.json(role);
  } catch (error) {
    reqLogger.error("Failed to fetch role", { error: errorMessage(error) });
    next(error);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    reqLogger.info("Creating role");
    const role = await roleService.createRole(req.body);
    reqLogger.info("Role created", { roleId: role.id });
    res.status(201).json(role);
  } catch (error) {
    reqLogger.error("Failed to create role", { error: errorMessage(error) });
    next(error);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseInt(req.params.id);
    reqLogger.info("Updating role", { roleId: id });
    const role = await roleService.updateRole(id, req.body);
    reqLogger.info("Role updated", { roleId: id });
    res.json(role);
  } catch (error) {
    reqLogger.error("Failed to update role", { error: errorMessage(error) });
    next(error);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  const reqLogger = new RequestLogger(req);
  try {
    const id = parseInt(req.params.id);
    reqLogger.info("Deleting role", { roleId: id });
    const result = await roleService.deleteRole(id);
    reqLogger.info("Role deleted", { roleId: id });
    res.json(result);
  } catch (error) {
    reqLogger.error("Failed to delete role", { error: errorMessage(error) });
    next(error);
  }
};
