import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { env } from '../config/env';
import { createUser } from './user.service';

export async function register(data: any) {
  // createUser hashes the password
  const user = await createUser(data);

  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
}

export async function login(email: string, passwordString: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValid = await bcrypt.compare(passwordString, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: '7d',
  });

  return { user, token };
}
