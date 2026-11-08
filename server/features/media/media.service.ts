import { createUploadTicket } from '~~/server/lib/object-storage';
import type {
  CreateUploadRequest,
  UploadContentType,
} from '~~/shared/contracts/media';

const FILE_EXTENSIONS: Record<UploadContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Uploads are namespaced by organization so keys never collide across tenants. */
export function issueOrganizationUploadTicket(
  organizationId: string,
  request: CreateUploadRequest
) {
  return createUploadTicket({
    key: `organizations/${organizationId}/${crypto.randomUUID()}.${FILE_EXTENSIONS[request.contentType]}`,
    ...request,
  });
}
