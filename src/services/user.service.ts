import { prisma } from '../prisma';
import bcrypt from 'bcryptjs';

export async function createUser(data: any) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
    },
  });
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({ where: { id } });
}
