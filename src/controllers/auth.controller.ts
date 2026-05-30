import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { register, login } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await register(data);

    return res.status(201).json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await login(data.email, data.password);

    return res.json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid email or password') {
      return res.status(401).json({ success: false, error: error.message });
    }
    next(error);
  }
};

export const meController = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // req.user is guaranteed by authenticate middleware
    return res.json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};
