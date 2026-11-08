import { issueBrandAssetUploadTicket } from '~~/server/features/media/brand-asset.service';
import { CreateBrandAssetUploadRequest } from '~~/shared/contracts/media';
import { AdminOrganizationRouteParams } from '~~/shared/contracts/organization';

// Fixed key per community, so the upload is refused while a file is there.
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'media:upload');
  const { organizationId } = await parseRouteParams(
    event,
    AdminOrganizationRouteParams
  );
  const request = await parseRequestBody(event, CreateBrandAssetUploadRequest);
  enrichLog(event, {
    organization_id: organizationId,
    brand_asset: { kind: request.kind, bytes: request.contentLength },
  });

  const { asset, ticket } = await issueBrandAssetUploadTicket(
    organizationId,
    request
  );
  enrichLog(event, { brand_asset: { key: asset.key } });
  return respondCreated(event, asset.url, ticket);
});
