import { PrismaClient, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOrganizations() {
    console.log('🏢 Seeding organizations...');

    const organizations = [
        {
            name: 'Flood Relief India',
            legalName: 'Flood Relief India Foundation',

            type: 'NGO',
            sector: 'Disaster Response',

            description:
                'Humanitarian disaster response organization coordinating flood relief operations.',

            location: 'Delhi, India',

            verificationStatus: VerificationStatus.VERIFIED,

            verified: true,

            status: 'ACTIVE',

            registrationNumber: crypto.randomUUID(),

            registrationType: 'NGO',

            registeredOfficeAddressLine:
                'Sector 62 Relief Coordination Center',

            registeredOfficeState: 'Delhi'
        },

        {
            name: 'Emergency Shelter Alliance',
            legalName: 'Emergency Shelter Alliance Network',

            type: 'NGO',
            sector: 'Shelter & Rehabilitation',

            description:
                'Emergency shelter coordination and rehabilitation support organization.',

            location: 'Mumbai, India',

            verificationStatus: VerificationStatus.VERIFIED,

            verified: true,

            status: 'ACTIVE',

            registrationNumber: crypto.randomUUID(),

            registrationType: 'NGO',

            registeredOfficeAddressLine:
                'Central Shelter Operations Hub',

            registeredOfficeState: 'Maharashtra'
        },

        {
            name: 'Rapid Medical Response',
            legalName: 'Rapid Medical Response Trust',

            type: 'NGO',
            sector: 'Medical Aid',

            description:
                'Rapid-response humanitarian medical support organization.',

            location: 'Bengaluru, India',

            verificationStatus: VerificationStatus.VERIFIED,

            verified: true,

            status: 'ACTIVE',

            registrationNumber: crypto.randomUUID(),

            registrationType: 'Trust',

            registeredOfficeAddressLine:
                'Medical Logistics & Coordination Center',

            registeredOfficeState: 'Karnataka'
        }
    ];

    const createdOrganizations = [];

    for (const org of organizations) {
        const createdOrganization = await prisma.organization.create({
            data: org
        });

        createdOrganizations.push(createdOrganization);
    }

    console.log(
        `✅ Seeded ${createdOrganizations.length} organizations`
    );

    return createdOrganizations;
}