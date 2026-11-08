import { deleteBrandAsset } from '~~/server/features/media/brand-asset.service';
import { BrandAssetRouteParams } from '~~/shared/contracts/media';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'media:delete');
  const { organizationId, kind } = await parseRouteParams(
    event,
    BrandAssetRouteParams
  );
  enrichLog(event, {
    organization_id: organizationId,
    brand_asset: { kind },
  });

  const asset = await deleteBrandAsset(organizationId, kind);
  enrichLog(event, { brand_asset: { key: asset.key } });
  return respondNoContent(event);
});
