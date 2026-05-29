import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  const user1 = await prisma.user.create({
    data: {
      name: 'Alice Admin',
      email: 'alice@example.com',
      passwordHash: 'hashed_password_alice',
    },
  });

  const org1 = await prisma.organization.create({
    data: {
      name: 'Hope Foundation',
      type: 'NGO',
      sector: 'Healthcare',
      description: 'Providing hope through medical aid.',
      location: 'New York, USA',
      verified: true,
      status: 'ACTIVE',
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'Helping Hands',
      type: 'COMMUNITY',
      sector: 'Food Relief',
      description: 'Community-driven food relief.',
      location: 'Los Angeles, USA',
      status: 'ACTIVE',
    },
  });

  await prisma.membership.create({
    data: {
      userId: user1.id,
      organizationId: org1.id,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
