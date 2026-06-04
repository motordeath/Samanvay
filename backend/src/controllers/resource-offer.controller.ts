import { Request, Response } from 'express';
import { createResourceOfferSchema } from '../schemas/resource.schema';
import { createResourceOffer, getResourceOffers, getOfferById, acceptOffer, rejectOffer, withdrawOffer } from '../services/resource-offer.service';
import { createSuccessResponse } from '../utils/response';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError, ValidationError } from '../utils/errors';

export const createResourceOfferController = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createResourceOfferSchema.parse(req.body);
  const offer = await createResourceOffer(validatedData);
  res.status(201).json(createSuccessResponse(offer));
});

export const getResourceOffersController = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  
  const filters: any = {};
  if (req.query.needId) filters.needId = req.query.needId;
  if (req.query.organizationId) filters.organizationId = req.query.organizationId;
  if (req.query.status) filters.status = req.query.status;

  const offers = await getResourceOffers(filters, skip, limit);
  res.status(200).json(createSuccessResponse(offers));
});

export const getResourceOfferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const offer = await getOfferById(id);
  if (!offer) {
    throw new NotFoundError('ResourceOffer not found');
  }
  res.status(200).json(createSuccessResponse(offer));
});

/**
 * Note: organizationId and userId are temporary placeholders until authentication 
 * and authorization middleware are implemented. Future phases will derive actor 
 * context from authenticated request state rather than request payloads.
 */
export const acceptOfferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organizationId, userId } = req.body;
  
  if (!organizationId || !userId) {
    throw new ValidationError('organizationId and userId are required in body');
  }

  const transfer = await acceptOffer(id, organizationId, userId);
  res.status(200).json(createSuccessResponse(transfer));
});

/**
 * Note: organizationId is a temporary placeholder until authentication 
 * and authorization middleware are implemented. Future phases will derive actor 
 * context from authenticated request state rather than request payloads.
 */
export const rejectOfferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organizationId } = req.body;
  
  if (!organizationId) {
    throw new ValidationError('organizationId is required in body');
  }

  const offer = await rejectOffer(id, organizationId);
  res.status(200).json(createSuccessResponse(offer));
});

export const withdrawOfferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { organizationId } = req.body;
  
  if (!organizationId) {
    throw new ValidationError('organizationId is required in body');
  }

  const offer = await withdrawOffer(id, organizationId);
  res.status(200).json(createSuccessResponse(offer));
});
