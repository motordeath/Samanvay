import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Transfer Status Normalization...');
  
  // Fetch all transfers to check existing statuses
  const transfers = await prisma.transfer.findMany();
  
  for (const transfer of transfers) {
    const originalStatus = transfer.status;
    let newStatus = originalStatus.toUpperCase();
    
    // Check if it's already upper case or valid, otherwise update
    if (originalStatus !== newStatus) {
      console.log(`Updating Transfer ${transfer.id}: ${originalStatus} -> ${newStatus}`);
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: { status: newStatus },
      });
    }
  }
  
  console.log('Transfer Status Normalization complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
