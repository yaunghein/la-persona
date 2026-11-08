import { applyBrandAsset } from '~~/server/features/media/brand-asset.service';
import { BrandAssetRouteParams } from '~~/shared/contracts/media';

/** Points the community setting at the file uploaded with the ticket. */
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'media:upload');
  const { organizationId, kind } = await parseRouteParams(
    event,
    BrandAssetRouteParams
  );
  enrichLog(event, {
    organization_id: organizationId,
    brand_asset: { kind },
  });

  const asset = await applyBrandAsset(organizationId, kind);
  enrichLog(event, { brand_asset: { key: asset.key } });
  return asset;
});
