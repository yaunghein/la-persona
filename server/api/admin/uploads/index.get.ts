import { listStoredUploads } from '~~/server/features/media/card-image.service';
import type { Collection } from '~~/shared/contracts/collection';
import type { StoredUpload } from '~~/shared/contracts/media';

export default defineEventHandler(
  async (event): Promise<Collection<StoredUpload>> => {
    authorizePlatformAccess(event, 'media:upload');
    const items = await listStoredUploads();
    enrichLog(event, { uploads: { count: items.length } });
    return { items };
  }
);
