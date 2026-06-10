import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMemberships() {
    console.log('🤝 Seeding memberships...');

    const users = await prisma.user.findMany();

    const organizations = await prisma.organization.findMany();

    if (!users.length || !organizations.length) {
        throw new Error(
            'Users or Organizations missing before membership seeding'
        );
    }
    console.log('USERS:', users);
    console.log('ORGS:', organizations);
    const memberships = [
        {
            userId: users[0].id,
            organizationId: organizations[0].id,
            role: 'OWNER',
            status: 'ACTIVE'
        },

        {
            userId: users[1].id,
            organizationId: organizations[0].id,
            role: 'ADMIN',
            status: 'ACTIVE'
        },

        {
            userId: users[2].id,
            organizationId: organizations[1].id,
            role: 'COORDINATOR',
            status: 'ACTIVE'
        },

        {
            userId: users[3].id,
            organizationId: organizations[2].id,
            role: 'VOLUNTEER_MANAGER',
            status: 'ACTIVE'
        }
    ];

    for (const membership of memberships) {
        await prisma.membership.create({
            data: membership
        });
    }

    console.log(`✅ Seeded ${memberships.length} memberships`);
}