import { z } from 'zod';

export const createResourceSchema = z.object({
  name: z.string().max(200),
  description: z.string().optional(),
  unit: z.string(),
});

export const createResourceLotSchema = z.object({
  organizationId: z.string().uuid(),
  resourceId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
});

export const createResourceNeedSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  resourceId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  createdById: z.string().uuid(),
});

export const createResourceOfferSchema = z.object({
  needId: z.string().uuid(),
  offeringOrganizationId: z.string().uuid(),
  resourceLotId: z.string().uuid(),
  offeredQuantity: z.number().int().positive(),
  notes: z.string().optional(),
  createdById: z.string().uuid(),
});

// Transfer creation is automatic, but we might want a schema if we ever need it.
export const createTransferSchema = z.object({
  needId: z.string().uuid(),
  offerId: z.string().uuid(),
  resourceId: z.string().uuid(),
  fromOrganizationId: z.string().uuid(),
  toOrganizationId: z.string().uuid(),
  quantity: z.number().int().positive(),
  approvedById: z.string().uuid().optional(),
});
