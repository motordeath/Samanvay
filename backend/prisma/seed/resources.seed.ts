import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedResources() {
    console.log('📦 Seeding resources...');

    const resources = [
        // FOOD

        {
            name: 'Rice Bags (10kg)',
            unit: 'bags',
            description: '10kg packaged rice bags for emergency food distribution'
        },

        {
            name: 'Wheat Flour Bags (25kg)',
            unit: 'bags',
            description: '25kg wheat flour sacks for community kitchens'
        },

        {
            name: 'Ready-to-Eat Meal Kits',
            unit: 'kits',
            description: 'Pre-packaged emergency meal kits for disaster response'
        },

        {
            name: 'Baby Nutrition Formula (400g)',
            unit: 'cans',
            description: 'Infant nutritional formula cans'
        },

        {
            name: 'Cooking Oil Containers (15L)',
            unit: 'containers',
            description: 'Bulk cooking oil containers for relief kitchens'
        },

        // WATER

        {
            name: 'Drinking Water Cartons (24x1L)',
            unit: 'cartons',
            description: 'Cartons containing 24 one-liter water bottles'
        },

        {
            name: 'Water Tankers (5000L)',
            unit: 'tankers',
            description: 'Mobile potable water tanker units'
        },

        {
            name: 'Water Purification Tablets',
            unit: 'boxes',
            description: 'Emergency water purification tablet boxes'
        },

        // MEDICAL

        {
            name: 'Emergency Medical Kits',
            unit: 'kits',
            description: 'Primary trauma and emergency response medical kits'
        },

        {
            name: 'ORS Packets (Box of 100)',
            unit: 'boxes',
            description: 'Oral rehydration solution packet boxes'
        },

        {
            name: 'Surgical Masks (Pack of 50)',
            unit: 'packs',
            description: 'Disposable surgical protection masks'
        },

        {
            name: 'Gloves (Box of 100)',
            unit: 'boxes',
            description: 'Disposable medical examination gloves'
        },

        {
            name: 'Blood Storage Units',
            unit: 'units',
            description: 'Portable blood preservation containers'
        },

        // SHELTER

        {
            name: 'Relief Tents (Family Size)',
            unit: 'tents',
            description: 'Temporary shelter tents for displaced families'
        },

        {
            name: 'Blankets (Thermal)',
            unit: 'blankets',
            description: 'Cold-weather thermal blankets'
        },

        {
            name: 'Sleeping Mats',
            unit: 'mats',
            description: 'Portable sleeping ground mats'
        },

        {
            name: 'Tarpaulin Sheets',
            unit: 'sheets',
            description: 'Heavy-duty waterproof shelter tarpaulins'
        },

        // LOGISTICS

        {
            name: 'Diesel Barrels (200L)',
            unit: 'barrels',
            description: 'Fuel barrels for generators and logistics vehicles'
        },

        {
            name: 'Portable Generators (5kVA)',
            unit: 'generators',
            description: 'Field-deployable emergency generators'
        },

        {
            name: 'Solar Lantern Kits',
            unit: 'kits',
            description: 'Rechargeable solar-powered lighting kits'
        },

        // SANITATION

        {
            name: 'Hygiene Kits',
            unit: 'kits',
            description: 'Emergency personal hygiene kits'
        },

        {
            name: 'Sanitary Pad Packs',
            unit: 'packs',
            description: 'Women hygiene sanitary packs'
        },

        {
            name: 'Portable Toilets',
            unit: 'units',
            description: 'Deployable emergency sanitation units'
        }
    ];
    for (const resource of resources) {
        await prisma.resource.create({
            data: resource
        });
    }

    console.log(`✅ Seeded ${resources.length} resources`);
}