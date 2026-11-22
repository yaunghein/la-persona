import { issueCardImageUploadTicket } from '~~/server/features/media/card-image.service';
import { CreateCardImageUploadRequest } from '~~/shared/contracts/media';

// Fixed key per name, so the upload is refused while a file is there.
export default defineEventHandler(async (event) => {
  authorizePlatformAccess(event, 'media:upload');
  const request = await parseRequestBody(event, CreateCardImageUploadRequest);
  enrichLog(event, {
    card_image: { kind: request.kind, bytes: request.contentLength },
  });

  const { image, ticket } = await issueCardImageUploadTicket(request);
  enrichLog(event, { card_image: { key: image.key } });
  return respondCreated(event, image.url, ticket);
});
