import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { createUserSchema } from '../schemas/user.schema';
import { createSuccessResponse } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await userService.createUser(data);
    res.status(201).json(createSuccessResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const user = await userService.getUserById(id);
    if (!user) throw new Error('User not found');
    res.json(createSuccessResponse(user));
  } catch (error) {
    next(error);
  }
}
