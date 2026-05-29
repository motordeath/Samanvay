import { Request, Response, NextFunction } from 'express';
import * as eventService from '../services/event.service';
import { createEventSchema, updateEventSchema } from '../schemas/event.schema';
import { createSuccessResponse } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createEventSchema.parse(req.body);
    const event = await eventService.createEvent(data);
    res.status(201).json(createSuccessResponse(event));
  } catch (error) {
    next(error);
  }
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await eventService.getEvents();
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

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const data = updateEventSchema.parse(req.body);
    const event = await eventService.updateEvent(id, data);
    res.json(createSuccessResponse(event));
  } catch (error) {
    next(error);
  }
}
