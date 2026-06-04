"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding data...');
    const user1 = await prisma.user.create({
        data: {
            name: 'Alice Admin',
            email: 'alice@example.com',
            passwordHash: await bcryptjs_1.default.hash('password', 10),
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
    const event1 = await prisma.event.create({
        data: {
            title: 'Flood Relief Coordination',
            description: 'Emergency coordination test event',
            type: 'RELIEF_CAMPAIGN',
            status: 'PUBLISHED',
            startDate: new Date('2026-06-10T09:00:00Z'),
            endDate: new Date('2026-06-12T18:00:00Z'),
            organizationId: org1.id,
            createdById: user1.id,
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
    console.log({
        organizationId: org1.id,
        userId: user1.id,
        eventId: event1.id,
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
