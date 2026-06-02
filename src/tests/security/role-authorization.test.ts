import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { 
  requireTransferAccess, 
  requireEventAccess,
  requireOrganizationAccess,
  requirePartnershipAccess
} from '../../services/authorization.service';

describe('Authorization Role Hardening', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const setupTransfer = async (role: string) => {
    const orgFrom = await createTestOrganization();
    const orgTo = await createTestOrganization();
    const user = await createTestUser();

    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: orgTo.id, // User is member of orgTo
        role: role,
        status: 'ACTIVE',
      },
    });

    const resource = await prisma.resource.create({
      data: {
        name: 'test-resource-' + Date.now(),
        unit: 'kg',
      }
    });

    const need = await prisma.resourceNeed.create({
      data: {
        organizationId: orgTo.id,
        resourceId: resource.id,
        quantity: 10,
        status: 'OPEN',
        createdById: user.id,
      }
    });

    const lot = await prisma.resourceLot.create({
      data: {
        organizationId: orgFrom.id,
        resourceId: resource.id,
        quantity: 10,
        availableQuantity: 10,
      }
    });

    const offer = await prisma.resourceOffer.create({
      data: {
        needId: need.id,
        offeringOrganizationId: orgFrom.id,
        resourceLotId: lot.id,
        offeredQuantity: 10,
        status: 'ACCEPTED',
        createdById: user.id,
      }
    });

    const transfer = await prisma.transfer.create({
      data: {
        needId: need.id,
        offerId: offer.id,
        resourceId: resource.id,
        fromOrganizationId: orgFrom.id,
        toOrganizationId: orgTo.id,
        quantity: 10,
        status: 'PENDING',
      },
    });

    return { user, transfer, orgTo };
  };

  it('VOLUNTEER cannot complete transfer', async () => {
    const { user, transfer } = await setupTransfer('VOLUNTEER');

    await expect(
      requireTransferAccess(user.id, transfer.id, ['OWNER', 'ADMIN'])
    ).rejects.toThrow('Access denied for transfer');
  });

  it('ADMIN can complete transfer', async () => {
    const { user, transfer } = await setupTransfer('ADMIN');

    const result = await requireTransferAccess(user.id, transfer.id, ['OWNER', 'ADMIN']);
    expect(result.id).toBe(transfer.id);
  });

  it('COORDINATOR can manage event', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'COORDINATOR',
        status: 'ACTIVE',
      },
    });

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Event',
        type: 'Type',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
        status: 'PUBLISHED',
      },
    });

    const result = await requireEventAccess(user.id, event.id, ['OWNER', 'ADMIN', 'COORDINATOR']);
    expect(result.id).toBe(event.id);
  });

  it('Cross-org admin denied', async () => {
    const { transfer } = await setupTransfer('ADMIN');

    // Create a new user in a completely different org
    const orgOther = await createTestOrganization();
    const userOther = await createTestUser();
    await prisma.membership.create({
      data: {
        userId: userOther.id,
        organizationId: orgOther.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Try to access the transfer using the other admin
    await expect(
      requireTransferAccess(userOther.id, transfer.id, ['OWNER', 'ADMIN'])
    ).rejects.toThrow('Access denied for transfer');
  });
});
