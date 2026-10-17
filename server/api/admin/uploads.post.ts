import { issueOrganizationUploadTicket } from '~~/server/features/media/media.service';
import { CreateAdminUploadRequest } from '~~/shared/contracts/media';

// Thakhin uploads community assets without being a member of the community.
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'media:upload');
  const { organizationId, ...request } = await parseRequestBody(
    event,
    CreateAdminUploadRequest
  );
  enrichLog(event, {
    upload: {
      organization_id: organizationId,
      content_type: request.contentType,
      bytes: request.contentLength,
    },
  });

  const ticket = await issueOrganizationUploadTicket(organizationId, request);
  return respondCreated(event, resolveObjectStorageUrl(ticket.key), ticket);
});
