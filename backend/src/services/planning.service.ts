import { prisma } from '../prisma';

export interface CoordinationStatus {
  staffing: {
    required: number;
    assigned: number;
    status: 'READY' | 'AT_RISK' | 'BLOCKED';
  };
  resources: {
    required: number;
    reserved: number;
    status: 'READY' | 'SHORTAGE' | 'AT_RISK';
  };
  transfers: {
    pending: number;
  };
  overallStatus: 'READY' | 'AT_RISK' | 'BLOCKED' | 'ACTIVE' | 'COMPLETED';
}
export async function getEventReadiness(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      volunteerNeeds: true,
      reservations: true,
    },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  return {
    status: 'READY',
    volunteerNeeds: event.volunteerNeeds.length,
    reservations: event.reservations.length,
  };
}

export class PlanningService {
  static async getEventCoordinationStatus(eventId: string): Promise<CoordinationStatus> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.status === 'COMPLETED') {
      return {
        staffing: { required: 0, assigned: 0, status: 'READY' },
        resources: { required: 0, reserved: 0, status: 'READY' },
        transfers: { pending: 0 },
        overallStatus: 'COMPLETED',
      };
    }


    // --- 1. Staffing Aggregation ---
    const volunteerNeeds = await prisma.volunteerNeed.findMany({
      where: { eventId, status: { not: 'CLOSED' } },
      select: {
        requiredCount: true,
        _count: {
          select: {
            assignments: {
              where: {
                status: {
                  in: ['ASSIGNED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED']
                }
              }
            }
          }
        }
      }
    });

    let staffingRequired = 0;
    let staffingAssigned = 0;

    for (const need of volunteerNeeds) {
      staffingRequired += need.requiredCount;
      staffingAssigned += need._count.assignments;
    }

    const staffingStatus = staffingAssigned >= staffingRequired ? 'READY' : 'AT_RISK';

    // --- 2. Resource Aggregation ---
    const resourceNeeds = await prisma.resourceNeed.findMany({
      where: { eventId, status: { not: 'CLOSED' } },
      select: { quantity: true },
    });

    const reservations = await prisma.reservation.findMany({
      where: { eventId, status: { notIn: ['CANCELLED', 'EXPIRED'] } },
      select: { reservedQuantity: true, allocatedQuantity: true },
    });

    let resourcesRequired = 0;
    let resourcesReserved = 0;

    for (const need of resourceNeeds) {
      resourcesRequired += need.quantity;
    }

    for (const res of reservations) {
      resourcesReserved += (res.reservedQuantity + res.allocatedQuantity);
    }

    let resourcesStatus: 'READY' | 'SHORTAGE' | 'AT_RISK' = 'READY';
    if (resourcesRequired > resourcesReserved) {
      // For simplicity, if we have less than required, it's a SHORTAGE.
      resourcesStatus = 'SHORTAGE';
    }

    // --- 3. Transfer Aggregation ---
    // Count transfers linked through event's resource needs or reservations
    const transfersViaNeeds = await prisma.transfer.count({
      where: {
        need: { eventId },
        status: { in: ['PENDING', 'APPROVED', 'IN_TRANSIT', 'PARTIALLY_COMPLETED'] }
      }
    });

    const transfersViaReservations = await prisma.transfer.count({
      where: {
        allocations: {
          some: {
            reservation: { eventId }
          }
        },
        status: { in: ['PENDING', 'APPROVED', 'IN_TRANSIT', 'PARTIALLY_COMPLETED'] }
      }
    });

    // Simple aggregate (could have overlaps if a transfer is linked to both, but that's unlikely in current logic)
    const pendingTransfers = transfersViaNeeds + transfersViaReservations;

    // --- 4. Overall Status Derivation ---
    let overallStatus: 'READY' | 'AT_RISK' | 'BLOCKED' | 'ACTIVE' | 'COMPLETED' = 'READY';

    if (event.status === 'PUBLISHED') {
      overallStatus = 'ACTIVE';
    } else {
      // In DRAFT or similar planning states
      if (staffingStatus === 'AT_RISK' || resourcesStatus === 'SHORTAGE') {
        overallStatus = 'AT_RISK';
      }

      // If severe lack, it could be BLOCKED (e.g., 0 assigned but required > 0)
      if ((staffingRequired > 0 && staffingAssigned === 0) ||
        (resourcesRequired > 0 && resourcesReserved === 0)) {
        overallStatus = 'BLOCKED';
      }
    }

    return {
      staffing: {
        required: staffingRequired,
        assigned: staffingAssigned,
        status: staffingStatus,
      },
      resources: {
        required: resourcesRequired,
        reserved: resourcesReserved,
        status: resourcesStatus,
      },
      transfers: {
        pending: pendingTransfers,
      },
      overallStatus,
    };
  }
}
