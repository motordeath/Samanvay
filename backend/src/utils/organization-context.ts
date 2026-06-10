import { Request } from 'express';

export function getOrganizationContext(req: Request): string | undefined {

  // 1. Header-based org context (PRIMARY)
  const headerOrgId = req.headers['x-org-id'];

  if (typeof headerOrgId === 'string') {
    return headerOrgId;
  }

  // 2. Route params
  if (req.params.organizationId) {
    return req.params.organizationId;
  }

  // 3. Request body
  if (req.body && req.body.organizationId) {
    return req.body.organizationId;
  }

  // 4. Query params
  if (
    req.query.organizationId &&
    typeof req.query.organizationId === 'string'
  ) {
    return req.query.organizationId;
  }

  return undefined;
}