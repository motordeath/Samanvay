import { prisma } from './src/prisma';
import { getResourceLots } from './src/services/resource-lot.service';
import { transferService } from './src/modules/resources/transfer/service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const lots = await getResourceLots({}, 0, 1);
  const transfers = await transferService.getTransfers({}, 0, 1);
  
  const snapshot = `# API Contract Snapshot

## Inventory (Resource Lot) Response Example
\`\`\`json
${JSON.stringify(lots[0] || {}, null, 2)}
\`\`\`

## Transfer Response Example
\`\`\`json
${JSON.stringify(transfers[0] || {}, null, 2)}
\`\`\`
`;

  fs.writeFileSync(path.join(__dirname, 'API_CONTRACT_SNAPSHOT.md'), snapshot);
  console.log("Snapshot captured.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
