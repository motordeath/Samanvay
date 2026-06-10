import { PrismaClient } from '@prisma/client';

import { seedOrganizations } from './organizations.seed';
import { seedUsers } from './users.seed';
import { seedMemberships } from './memberships.seed';
import { seedResources } from './resources.seed';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');
    await prisma.membership.deleteMany();
    await prisma.user.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.organization.deleteMany();
    await seedOrganizations();

    await seedUsers();

    await seedResources();

    await seedMemberships();

    console.log('✅ Database seed completed');
}

main()
    .catch((error) => {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });