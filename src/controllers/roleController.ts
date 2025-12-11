import { Request, Response, NextFunction } from "express";
import * as roleService from "../services/roleService";

export const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json(roles);
  } catch (error) {
    next(error);
  }
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await roleService.getRoleById(parseInt(req.params.id));
    res.json(role);
  } catch (error) {
    next(error);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await roleService.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await roleService.updateRole(parseInt(req.params.id), req.body);
    res.json(role);
  } catch (error) {
    next(error);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await roleService.deleteRole(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};