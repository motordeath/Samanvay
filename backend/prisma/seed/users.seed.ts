import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedUsers() {
    console.log('👤 Seeding users...');

    const password = 'Samanvay@123';

    const passwordHash = await bcrypt.hash(password, 10);

    const users = [
        {
            name: 'Aditya Sharma',
            email: 'adi@samanvay.org',
            passwordHash
        },

        {
            name: 'Aisha Khan',
            email: 'aisha@samanvay.org',
            passwordHash
        },

        {
            name: 'Ravi Mehta',
            email: 'ravi@samanvay.org',
            passwordHash
        },

        {
            name: 'Sarah Joseph',
            email: 'sarah@samanvay.org',
            passwordHash
        }
    ];

    const createdUsers = [];

    for (const user of users) {
        const createdUser = await prisma.user.create({
            data: user
        });

        createdUsers.push(createdUser);
    }

    console.log(`✅ Seeded ${createdUsers.length} users`);

    return createdUsers;
}