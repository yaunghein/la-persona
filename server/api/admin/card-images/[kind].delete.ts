import { deleteCardImage } from '~~/server/features/media/card-image.service';
import {
  CardImageNameQuery,
  CardImageRouteParams,
} from '~~/shared/contracts/media';

export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'media:delete');
  const { kind } = await parseRouteParams(event, CardImageRouteParams);
  const { name } = await parseRequestQuery(event, CardImageNameQuery);
  enrichLog(event, { card_image: { kind } });

  const image = await deleteCardImage(kind, name);
  enrichLog(event, { card_image: { key: image.key } });
  return respondNoContent(event);
});
