import { Request, Response, NextFunction } from 'express';
import { createResourceOfferSchema } from '../schemas/resource.schema';
import { createResourceOffer, getResourceOffers, getOfferById, acceptOffer, rejectOffer, withdrawOffer } from '../services/resource-offer.service';
import { createSuccessResponse } from '../utils/response';

export async function createResourceOfferController(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = createResourceOfferSchema.parse(req.body);
    const offer = await createResourceOffer(validatedData);
    res.status(201).json(createSuccessResponse(offer));
  } catch (error) {
    next(error);
  }
}

export async function getResourceOffersController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const filters: any = {};
    if (req.query.needId) filters.needId = req.query.needId;
    if (req.query.organizationId) filters.organizationId = req.query.organizationId;
    if (req.query.status) filters.status = req.query.status;

    const offers = await getResourceOffers(filters, skip, limit);
    res.status(200).json(createSuccessResponse(offers));
  } catch (error) {
    next(error);
  }
}

export async function getResourceOfferController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const offer = await getOfferById(id);
    if (!offer) {
      return res.status(404).json({ success: false, error: { message: 'ResourceOffer not found' } });
    }
    res.status(200).json(createSuccessResponse(offer));
  } catch (error) {
    next(error);
  }
}

export async function acceptOfferController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { organizationId, userId } = req.body;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ success: false, error: { message: 'organizationId and userId are required in body' } });
    }

    const transfer = await acceptOffer(id, organizationId, userId);
    res.status(200).json(createSuccessResponse(transfer));
  } catch (error) {
    next(error);
  }
}

export async function rejectOfferController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ success: false, error: { message: 'organizationId is required in body' } });
    }

    const offer = await rejectOffer(id, organizationId);
    res.status(200).json(createSuccessResponse(offer));
  } catch (error) {
    next(error);
  }
}

export async function withdrawOfferController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const offer = await withdrawOffer(id);
    res.status(200).json(createSuccessResponse(offer));
  } catch (error) {
    next(error);
  }
}
