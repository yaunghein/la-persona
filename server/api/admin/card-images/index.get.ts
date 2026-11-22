import { listCardImages } from '~~/server/features/media/card-image.service';
import type { Collection } from '~~/shared/contracts/collection';
import { CardImageNameQuery, type CardImage } from '~~/shared/contracts/media';

export default defineEventHandler(
  async (event): Promise<Collection<CardImage>> => {
    authorizePlatformAccess(event, 'media:upload');
    const { name } = await parseRequestQuery(event, CardImageNameQuery);
    const images = await listCardImages(name);
    enrichLog(event, { card_image: { key: images[0]?.key } });
    return { items: images };
  }
);
