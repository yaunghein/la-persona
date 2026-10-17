import { issueOrganizationUploadTicket } from '~~/server/features/media/media.service';
import { CreateUploadRequest } from '~~/shared/contracts/media';
import { OrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(async (event) => {
  const { orgSlug } = await parseRouteParams(event, OrganizationRouteParams);
  const { organization } = await authorizeOrganizationAccess(
    event,
    orgSlug,
    'media:upload'
  );
  const request = await parseRequestBody(event, CreateUploadRequest);
  enrichLog(event, {
    upload: { content_type: request.contentType, bytes: request.contentLength },
  });

  const ticket = await issueOrganizationUploadTicket(organization.id, request);
  return respondCreated(event, resolveObjectStorageUrl(ticket.key), ticket);
});
