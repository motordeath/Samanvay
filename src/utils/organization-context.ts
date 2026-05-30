import { Request } from 'express';

export function getOrganizationContext(req: Request): string | undefined {
  // Priority order: params > body > query
  if (req.params.organizationId) {
    return req.params.organizationId;
  }
  
  if (req.body && req.body.organizationId) {
    return req.body.organizationId;
  }
  
  if (req.query.organizationId && typeof req.query.organizationId === 'string') {
    return req.query.organizationId;
  }

  return undefined;
}
