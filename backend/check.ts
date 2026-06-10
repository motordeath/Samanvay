import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const needs = await prisma.resourceNeed.findMany({ include: { organization: true, resource: true }});
  const offers = await prisma.resourceOffer.findMany({ include: { offeringOrganization: true, resourceLot: true, need: true }});
  const transfers = await prisma.transfer.findMany({ include: { fromOrganization: true, toOrganization: true, resource: true, need: true, offer: true }});
  const lots = await prisma.resourceLot.findMany({ include: { organization: true, resource: true }});
  const activities = await prisma.activityEvent.findMany();
  
  console.log('Needs without Org:', needs.filter(n => !n.organization).length);
  console.log('Offers without Lot:', offers.filter(o => !o.resourceLot).length);
  console.log('Transfers without Offer:', transfers.filter(t => !t.offer).length);
  console.log('Lots without Resource:', lots.filter(l => !l.resource).length);
  console.log('Activities without Org:', activities.filter(a => !a.organizationId).length);
}
check().finally(() => prisma.$disconnect());
