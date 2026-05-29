import { prisma } from '../prisma';

export async function createUser(data: any) {
  // Mock hashing for Phase 1 as per requirements
  const passwordHash = `hashed_${data.password}`;
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
