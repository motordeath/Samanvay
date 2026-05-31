import { Request, Response, NextFunction } from 'express';
import * as eventService from '../services/event.service';
import { createEventSchema, updateEventSchema } from '../schemas/event.schema';
import { createSuccessResponse } from '../utils/response';
import { safeAudit } from '../utils/safe-audit';
import { createAuditLog } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth.middleware';

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createEventSchema.parse(req.body);
    const event = await eventService.createEvent(data);

    await safeAudit(() =>
      createAuditLog({
        action: 'EVENT_CREATED',
        entityType: 'EVENT',
        entityId: event.id,
        userId: req.user?.id,
        organizationId: event.organizationId,
      })
    );

    res.status(201).json(createSuccessResponse(event));
  } catch (error) {
    next(error);
  }
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const events = await eventService.getEvents(skip, limit);
    res.json(createSuccessResponse(events));
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const event = await eventService.getEventById(id);
    if (!event) throw new Error('Event not found');
    res.json(createSuccessResponse(event));
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const data = updateEventSchema.parse(req.body);
    const event = await eventService.updateEvent(id, data);

    await safeAudit(() =>
      createAuditLog({
        action: 'EVENT_UPDATED',
        entityType: 'EVENT',
        entityId: event.id,
        userId: req.user?.id,
        organizationId: event.organizationId,
      })
    );

    res.json(createSuccessResponse(event));
  } catch (error) {
    next(error);
  }
}
