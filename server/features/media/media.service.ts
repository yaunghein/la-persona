import { createUploadTicket } from '~~/server/lib/object-storage';
import type { CreateUploadRequest } from '~~/shared/contracts/media';

/** Uploads are namespaced by organization so keys never collide across tenants. */
export function issueOrganizationUploadTicket(
  organizationId: string,
  request: CreateUploadRequest
) {
  return createUploadTicket({
    keyPrefix: `organizations/${organizationId}`,
    ...request,
  });
}
