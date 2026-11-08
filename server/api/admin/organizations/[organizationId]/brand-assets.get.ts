import { listBrandAssets } from '~~/server/features/media/brand-asset.service';
import type { Collection } from '~~/shared/contracts/collection';
import type { BrandAsset } from '~~/shared/contracts/media';
import { AdminOrganizationRouteParams } from '~~/shared/contracts/organization';

export default defineEventHandler(
  async (event): Promise<Collection<BrandAsset>> => {
    authorizePlatformAccess(event, 'media:upload');
    const { organizationId } = await parseRouteParams(
      event,
      AdminOrganizationRouteParams
    );
    enrichLog(event, { organization_id: organizationId });
    return { items: await listBrandAssets(organizationId) };
  }
);
