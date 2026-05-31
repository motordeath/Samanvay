import { Request, Response, NextFunction } from 'express';
import { createResourceOfferSchema } from '../schemas/resource.schema';
import { createResourceOffer, getResourceOffers, getOfferById, acceptOffer, rejectOffer, withdrawOffer } from '../services/resource-offer.service';
import { createSuccessResponse } from '../utils/response';
import { safeAudit } from '../utils/safe-audit';
import { createAuditLog } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth.middleware';

export async function createResourceOfferController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const validatedData = createResourceOfferSchema.parse(req.body);
    const offer = await createResourceOffer(validatedData);

    await safeAudit(() =>
      createAuditLog({
        action: 'RESOURCE_OFFER_CREATED',
        entityType: 'RESOURCE_OFFER',
        entityId: offer.id,
        userId: req.user?.id,
        organizationId: offer.offeringOrganizationId,
      })
    );

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

export async function acceptOfferController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ success: false, error: { message: 'organizationId is required in body' } });
    }

    const result = await acceptOffer(id, organizationId, req.user!.id);
    const transfer = result.transfer;

    await safeAudit(() =>
      createAuditLog({
        action: 'RESOURCE_OFFER_ACCEPTED',
        entityType: 'RESOURCE_OFFER',
        entityId: id,
        userId: req.user?.id,
        organizationId: result.organizationId,
      })
    );

    res.status(200).json(createSuccessResponse(transfer));
  } catch (error) {
    next(error);
  }
}

export async function rejectOfferController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ success: false, error: { message: 'organizationId is required in body' } });
    }

    const result = await rejectOffer(id, organizationId);
    const offer = result.offer;

    await safeAudit(() =>
      createAuditLog({
        action: 'RESOURCE_OFFER_REJECTED',
        entityType: 'RESOURCE_OFFER',
        entityId: offer.id,
        userId: req.user?.id,
        organizationId: result.organizationId,
      })
    );

    res.status(200).json(createSuccessResponse(offer));
  } catch (error) {
    next(error);
  }
}

export async function withdrawOfferController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ success: false, error: { message: 'organizationId is required in body' } });
    }

    const offer = await withdrawOffer(id, organizationId);

    await safeAudit(() =>
      createAuditLog({
        action: 'RESOURCE_OFFER_WITHDRAWN',
        entityType: 'RESOURCE_OFFER',
        entityId: offer.id,
        userId: req.user?.id,
        organizationId: offer.offeringOrganizationId,
      })
    );

    res.status(200).json(createSuccessResponse(offer));
  } catch (error: any) {
    if (error.message === 'Only the offering organization may withdraw the offer.') {
      return res.status(403).json({ success: false, error: { message: error.message } });
    }
    next(error);
  }
}
